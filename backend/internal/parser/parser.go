// Package parser implements the text-based command protocol.
// Commands follow the pattern: COMMAND arg1 arg2 ...
// Lines are terminated by \r\n or \n.
// Whitespace between tokens is collapsed; quoted strings support spaces.
package parser

import (
	"errors"
	"strings"
	"unicode"
)

// Command represents a parsed client command.
type Command struct {
	Name string   // uppercase verb e.g. "SET"
	Args []string // remaining tokens
}

// ErrEmptyCommand is returned when the input is blank.
var ErrEmptyCommand = errors.New("empty command")

// Parse turns a raw line into a Command.
// It handles quoted arguments so: SET key "hello world" works.
func Parse(line string) (*Command, error) {
	line = strings.TrimRight(line, "\r\n")
	tokens, err := tokenize(line)
	if err != nil {
		return nil, err
	}
	if len(tokens) == 0 {
		return nil, ErrEmptyCommand
	}
	return &Command{
		Name: strings.ToUpper(tokens[0]),
		Args: tokens[1:],
	}, nil
}

// tokenize splits a line on whitespace, respecting double-quoted strings.
func tokenize(s string) ([]string, error) {
	var tokens []string
	var cur strings.Builder
	inQuote := false

	for i := 0; i < len(s); i++ {
		c := rune(s[i])
		switch {
		case c == '"':
			inQuote = !inQuote
		case !inQuote && unicode.IsSpace(c):
			if cur.Len() > 0 {
				tokens = append(tokens, cur.String())
				cur.Reset()
			}
		default:
			cur.WriteRune(c)
		}
	}
	if inQuote {
		return nil, errors.New("unterminated quoted string")
	}
	if cur.Len() > 0 {
		tokens = append(tokens, cur.String())
	}
	return tokens, nil
}

// Arity returns the expected argument count for known commands.
// Returns -1 if the command takes a variable number of args.
func Arity(name string) int {
	fixed := map[string]int{
		"GET": 1, "DEL": 1, "TTL": 1,
		"LPOP": 1, "SMEMBERS": 1,
		"KEYS": 0, "DBSIZE": 0, "PING": 0, "FLUSHALL": 0,
	}
	if n, ok := fixed[name]; ok {
		return n
	}
	return -1 // variable / checked at handler
}
