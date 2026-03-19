// cmd/benchmark/main.go — load tester for the DATA_STORE server.
// Spins up N goroutines, each sending M commands and recording latency.
package main

import (
	"bufio"
	"flag"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

func main() {
	addr     := flag.String("addr",    "127.0.0.1:6399", "server address")
	clients  := flag.Int("clients",   50,               "number of concurrent clients")
	requests := flag.Int("requests",  1000,             "requests per client")
	pipeline := flag.Int("pipeline",  1,                "pipeline depth (1 = no pipelining)")
	cmdFlag  := flag.String("cmd",    "mixed",          "command to bench: set|get|ping|mixed")
	flag.Parse()

	log.Printf("benchmarking %s — %d clients × %d req, pipeline=%d, cmd=%s",
		*addr, *clients, *requests, *pipeline, *cmdFlag)

	total := *clients * *requests
	latencies := make([]int64, 0, total)
	var mu sync.Mutex
	var errors atomic.Int64

	start := time.Now()
	var wg sync.WaitGroup

	for i := 0; i < *clients; i++ {
		wg.Add(1)
		go func(clientID int) {
			defer wg.Done()
			conn, err := net.DialTimeout("tcp", *addr, 3*time.Second)
			if err != nil {
				log.Printf("client %d: connect error: %v", clientID, err)
				errors.Add(int64(*requests))
				return
			}
			defer conn.Close()

			reader := bufio.NewReader(conn)
			writer := bufio.NewWriter(conn)

			local := make([]int64, 0, *requests)

			for j := 0; j < *requests; j++ {
				cmd := buildCmd(*cmdFlag, clientID, j)
				t0 := time.Now()
				fmt.Fprintf(writer, "%s\r\n", cmd)
				if err := writer.Flush(); err != nil {
					errors.Add(1)
					continue
				}
				if _, err := reader.ReadString('\n'); err != nil {
					errors.Add(1)
					continue
				}
				local = append(local, time.Since(t0).Microseconds())
			}

			mu.Lock()
			latencies = append(latencies, local...)
			mu.Unlock()
		}(i)
	}

	wg.Wait()
	elapsed := time.Since(start)

	if len(latencies) == 0 {
		log.Fatalf("no successful requests")
	}

	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })

	n := int64(len(latencies))
	var sum int64
	for _, v := range latencies { sum += v }
	avg := float64(sum) / float64(n)

	p50  := latencies[n*50/100]
	p95  := latencies[n*95/100]
	p99  := latencies[n*99/100]
	p999 := latencies[n*999/1000]

	stddev := 0.0
	for _, v := range latencies {
		d := float64(v) - avg
		stddev += d * d
	}
	stddev = math.Sqrt(stddev / float64(n))

	opsPerSec := float64(n) / elapsed.Seconds()

	fmt.Println(strings.Repeat("─", 50))
	fmt.Printf("  Requests completed : %d\n", n)
	fmt.Printf("  Errors             : %d\n", errors.Load())
	fmt.Printf("  Total time         : %.3fs\n", elapsed.Seconds())
	fmt.Printf("  Throughput         : %.0f req/s\n", opsPerSec)
	fmt.Println(strings.Repeat("─", 50))
	fmt.Printf("  Latency (µs)\n")
	fmt.Printf("    avg              : %.1f\n", avg)
	fmt.Printf("    stddev           : %.1f\n", stddev)
	fmt.Printf("    min              : %d\n", latencies[0])
	fmt.Printf("    p50              : %d\n", p50)
	fmt.Printf("    p95              : %d\n", p95)
	fmt.Printf("    p99              : %d\n", p99)
	fmt.Printf("    p99.9            : %d\n", p999)
	fmt.Printf("    max              : %d\n", latencies[n-1])
	fmt.Println(strings.Repeat("─", 50))
}

func buildCmd(kind string, client, req int) string {
	key := fmt.Sprintf("bench:c%d:k%d", client, req%100)
	switch kind {
	case "set":
		return fmt.Sprintf("SET %s %d", key, rand.Int63())
	case "get":
		return fmt.Sprintf("GET %s", key)
	case "ping":
		return "PING"
	default: // mixed
		switch req % 4 {
		case 0:
			return fmt.Sprintf("SET %s %d", key, rand.Int63())
		case 1:
			return fmt.Sprintf("GET %s", key)
		case 2:
			return fmt.Sprintf("LPUSH list:%d val%d", client, req)
		default:
			return "PING"
		}
	}
}
