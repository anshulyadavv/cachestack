// Package networking implements the TCP server and per-client goroutines.
// Design: one goroutine per client (Go's scheduler makes this cheap).
// Each client connection gets a buffered reader/writer; commands are parsed
// and dispatched synchronously within that goroutine — no shared mutable
// state except via the store (which manages its own mutex).
package networking

import (
	"bufio"
	"fmt"
	"log"
	"net"
	"strconv"
	"strings"
	"time"

	"datastore/internal/metrics"
	"datastore/internal/parser"
	"datastore/internal/persistence"
	"datastore/internal/pubsub"
	"datastore/internal/store"
)

// Server holds all shared subsystems.
type Server struct {
	Addr    string
	Store   *store.Store
	AOF     *persistence.AOF
	Metrics *metrics.Collector
	Broker  *pubsub.Broker
}

// ListenAndServe starts the TCP listener and accepts connections forever.
func (s *Server) ListenAndServe() error {
	ln, err := net.Listen("tcp", s.Addr)
	if err != nil {
		return fmt.Errorf("listen %s: %w", s.Addr, err)
	}
	log.Printf("[server] listening on %s", s.Addr)
	for {
		conn, err := ln.Accept()
		if err != nil {
			log.Printf("[server] accept error: %v", err)
			continue
		}
		s.Metrics.ConnOpen()
		go s.handleConn(conn)
	}
}

// handleConn serves a single client connection until it closes.
func (s *Server) handleConn(conn net.Conn) {
	defer func() {
		conn.Close()
		s.Metrics.ConnClose()
	}()

	addr := conn.RemoteAddr().String()
	log.Printf("[conn] new client %s", addr)

	reader := bufio.NewReaderSize(conn, 4096)
	writer := bufio.NewWriterSize(conn, 4096)

	// clientSubs tracks pub/sub channels this client has subscribed to.
	clientSubs := make(map[string]<-chan pubsub.Message)

	defer func() {
		for ch, msgCh := range clientSubs {
			s.Broker.Unsubscribe(ch, msgCh)
		}
	}()

	writeLine := func(s string) {
		writer.WriteString(s + "\r\n")
		writer.Flush()
	}

	for {
		// Set a generous read deadline to detect dead clients.
		conn.SetReadDeadline(time.Now().Add(10 * time.Minute))

		line, err := reader.ReadString('\n')
		if err != nil {
			if err.Error() != "EOF" {
				log.Printf("[conn] %s read error: %v", addr, err)
			}
			return
		}

		cmd, err := parser.Parse(line)
		if err != nil {
			if err != parser.ErrEmptyCommand {
				writeLine("-ERR " + err.Error())
				s.Metrics.RecordError()
			}
			continue
		}

		s.Metrics.RecordOp()
		log.Printf("[cmd] %s %s %s", time.Now().Format("15:04:05.000"), cmd.Name, strings.Join(cmd.Args, " "))

		resp := s.dispatch(cmd, clientSubs, writeLine)
		if resp != "" {
			writeLine(resp)
		}
	}
}

// dispatch routes a command to its handler and returns the response string.
// writeLine is provided for streaming responses (pub/sub push).
func (s *Server) dispatch(cmd *parser.Command, clientSubs map[string]<-chan pubsub.Message, writeLine func(string)) string {
	args := cmd.Args

	switch cmd.Name {

	// ---- Utility ----
	case "PING":
		if len(args) > 0 {
			return "+" + args[0]
		}
		return "+PONG"

	case "ECHO":
		if len(args) < 1 { return argErr(cmd.Name) }
		return "+" + args[0]

	case "DBSIZE":
		return fmt.Sprintf(":%d", s.Store.Len())

	case "KEYS":
		keys := s.Store.Keys()
		return formatArray(keys)

	case "INFO":
		info := s.Metrics.Summary(s.Store.Len(), s.Store.BytesUsed())
		return "$" + strconv.Itoa(len(info)) + "\r\n" + info

	case "FLUSHALL":
		for _, k := range s.Store.Keys() {
			s.Store.Del(k)
		}
		s.AOF.Append("FLUSHALL")
		return "+OK"

	// ---- String ----
	case "SET":
		if len(args) < 2 { return argErr(cmd.Name) }
		key, val := args[0], args[1]
		s.Store.Set(key, val)
		// Optional EX seconds
		if len(args) >= 4 && strings.ToUpper(args[2]) == "EX" {
			secs, err := strconv.Atoi(args[3])
			if err != nil { return "-ERR invalid EX value" }
			s.Store.Expire(key, time.Duration(secs)*time.Second)
		}
		s.AOF.Append("SET", args...)
		return "+OK"

	case "GET":
		if len(args) < 1 { return argErr(cmd.Name) }
		val, ok := s.Store.Get(args[0])
		if !ok { return "$-1" } // nil bulk string
		return bulkString(val)

	case "DEL":
		if len(args) < 1 { return argErr(cmd.Name) }
		n := s.Store.Del(args...)
		s.AOF.Append("DEL", args...)
		return fmt.Sprintf(":%d", n)

	case "EXISTS":
		if len(args) < 1 { return argErr(cmd.Name) }
		count := 0
		for _, k := range args {
			if _, ok := s.Store.Get(k); ok { count++ }
		}
		return fmt.Sprintf(":%d", count)

	// ---- TTL ----
	case "EXPIRE":
		if len(args) < 2 { return argErr(cmd.Name) }
		secs, err := strconv.Atoi(args[1])
		if err != nil { return "-ERR value is not an integer" }
		ok := s.Store.Expire(args[0], time.Duration(secs)*time.Second)
		s.AOF.Append("EXPIRE", args...)
		if ok { return ":1" }
		return ":0"

	case "TTL":
		if len(args) < 1 { return argErr(cmd.Name) }
		return fmt.Sprintf(":%d", s.Store.TTL(args[0]))

	// ---- List ----
	case "LPUSH":
		if len(args) < 2 { return argErr(cmd.Name) }
		n := s.Store.LPush(args[0], args[1:]...)
		s.AOF.Append("LPUSH", args...)
		return fmt.Sprintf(":%d", n)

	case "RPUSH":
		if len(args) < 2 { return argErr(cmd.Name) }
		n := s.Store.RPush(args[0], args[1:]...)
		s.AOF.Append("RPUSH", args...)
		return fmt.Sprintf(":%d", n)

	case "LPOP":
		if len(args) < 1 { return argErr(cmd.Name) }
		val, ok := s.Store.LPop(args[0])
		s.AOF.Append("LPOP", args[0])
		if !ok { return "$-1" }
		return bulkString(val)

	case "LRANGE":
		if len(args) < 3 { return argErr(cmd.Name) }
		start, err1 := strconv.Atoi(args[1])
		stop, err2  := strconv.Atoi(args[2])
		if err1 != nil || err2 != nil { return "-ERR value is not an integer" }
		items := s.Store.LRange(args[0], start, stop)
		return formatArray(items)

	// ---- Set ----
	case "SADD":
		if len(args) < 2 { return argErr(cmd.Name) }
		n := s.Store.SAdd(args[0], args[1:]...)
		s.AOF.Append("SADD", args...)
		return fmt.Sprintf(":%d", n)

	case "SMEMBERS":
		if len(args) < 1 { return argErr(cmd.Name) }
		members := s.Store.SMembers(args[0])
		return formatArray(members)

	// ---- Sorted Set ----
	case "ZADD":
		if len(args) < 3 { return argErr(cmd.Name) }
		score, err := strconv.ParseFloat(args[1], 64)
		if err != nil { return "-ERR score is not a float" }
		n := s.Store.ZAdd(args[0], score, args[2])
		s.AOF.Append("ZADD", args...)
		return fmt.Sprintf(":%d", n)

	case "ZRANGE":
		if len(args) < 3 { return argErr(cmd.Name) }
		start, err1 := strconv.Atoi(args[1])
		stop, err2  := strconv.Atoi(args[2])
		if err1 != nil || err2 != nil { return "-ERR value is not an integer" }
		members := s.Store.ZRange(args[0], start, stop)
		return formatArray(members)

	// ---- Pub/Sub ----
	case "SUBSCRIBE":
		if len(args) < 1 { return argErr(cmd.Name) }
		for _, ch := range args {
			if _, already := clientSubs[ch]; already { continue }
			msgCh := s.Broker.Subscribe(ch)
			clientSubs[ch] = msgCh
			writeLine(fmt.Sprintf("*3\r\n$9\r\nsubscribe\r\n$%d\r\n%s\r\n:%d",
				len(ch), ch, len(clientSubs)))
			// Spin a goroutine that forwards incoming pub/sub messages to this client.
			go func(channel string, recv <-chan pubsub.Message) {
				for msg := range recv {
					payload := fmt.Sprintf("*3\r\n$7\r\nmessage\r\n$%d\r\n%s\r\n$%d\r\n%s",
						len(msg.Channel), msg.Channel, len(msg.Payload), msg.Payload)
					writeLine(payload)
				}
			}(ch, msgCh)
		}
		return "" // responses already sent inline

	case "UNSUBSCRIBE":
		for _, ch := range args {
			if msgCh, ok := clientSubs[ch]; ok {
				s.Broker.Unsubscribe(ch, msgCh)
				delete(clientSubs, ch)
				writeLine(fmt.Sprintf("*3\r\n$11\r\nunsubscribe\r\n$%d\r\n%s\r\n:%d",
					len(ch), ch, len(clientSubs)))
			}
		}
		return ""

	case "PUBLISH":
		if len(args) < 2 { return argErr(cmd.Name) }
		n := s.Broker.Publish(args[0], args[1])
		return fmt.Sprintf(":%d", n)

	default:
		s.Metrics.RecordError()
		return fmt.Sprintf("-ERR unknown command '%s'", cmd.Name)
	}
}

// ---- Wire format helpers ----

func bulkString(s string) string {
	return fmt.Sprintf("$%d\r\n%s", len(s), s)
}

func formatArray(items []string) string {
	if items == nil {
		return "*0"
	}
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("*%d\r\n", len(items)))
	for _, item := range items {
		sb.WriteString(fmt.Sprintf("$%d\r\n%s\r\n", len(item), item))
	}
	return strings.TrimRight(sb.String(), "\r\n")
}

func argErr(name string) string {
	return fmt.Sprintf("-ERR wrong number of arguments for '%s'", strings.ToLower(name))
}

// parseHTTPCommand parses a command string for HTTP exec endpoint.
func parseHTTPCommand(line string) (*parser.Command, error) {
	return parser.Parse(line)
}
