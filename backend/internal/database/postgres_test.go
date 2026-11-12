package database

import (
	"net/url"
	"strings"
	"testing"

	"github.com/lib/pq"
)

func TestPreparePostgresURL(t *testing.T) {
	tests := []struct {
		name         string
		dsn          string
		wantSSLMode  string
		wantTimeout  string
		wantAppName  string
		wantPassword string
		wantErr      bool
	}{
		{
			name:         "supabase direct connection",
			dsn:          "postgresql://postgres:s3cret@db.abcd.supabase.co:5432/postgres",
			wantSSLMode:  "require",
			wantTimeout:  "10",
			wantAppName:  "eneba-api",
			wantPassword: "s3cret",
		},
		{
			name:         "supabase transaction pooler",
			dsn:          "postgres://postgres.abcd:s3cret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
			wantSSLMode:  "require",
			wantTimeout:  "10",
			wantAppName:  "eneba-api",
			wantPassword: "s3cret",
		},
		{
			name:         "explicit settings are preserved",
			dsn:          "postgres://user:pass@db.example.com:5432/eneba?sslmode=verify-full&connect_timeout=30&application_name=my-api",
			wantSSLMode:  "verify-full",
			wantTimeout:  "30",
			wantAppName:  "my-api",
			wantPassword: "pass",
		},
		{
			name:         "local postgres keeps sslmode disable",
			dsn:          "postgres://eneba:eneba@localhost:5432/eneba?sslmode=disable",
			wantSSLMode:  "disable",
			wantTimeout:  "10",
			wantAppName:  "eneba-api",
			wantPassword: "eneba",
		},
		{
			name:         "percent encoded password survives",
			dsn:          "postgres://postgres:p%40ss%2Fword@db.abcd.supabase.co:5432/postgres",
			wantSSLMode:  "require",
			wantTimeout:  "10",
			wantAppName:  "eneba-api",
			wantPassword: "p@ss/word",
		},
		{
			name:    "unsupported scheme",
			dsn:     "mysql://user:pass@localhost:3306/eneba",
			wantErr: true,
		},
		{
			name:    "missing host",
			dsn:     "postgres:///eneba",
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			prepared, err := preparePostgresURL(tt.dsn)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected an error, got %q", prepared)
				}
				return
			}
			if err != nil {
				t.Fatalf("preparePostgresURL: %v", err)
			}
			parsed, err := url.Parse(prepared)
			if err != nil {
				t.Fatalf("parse prepared URL: %v", err)
			}
			query := parsed.Query()
			if got := query.Get("sslmode"); got != tt.wantSSLMode {
				t.Fatalf("sslmode = %q, want %q (URL %s)", got, tt.wantSSLMode, prepared)
			}
			if got := query.Get("connect_timeout"); got != tt.wantTimeout {
				t.Fatalf("connect_timeout = %q, want %q", got, tt.wantTimeout)
			}
			if got := query.Get("application_name"); got != tt.wantAppName {
				t.Fatalf("application_name = %q, want %q", got, tt.wantAppName)
			}
			if password, _ := parsed.User.Password(); password != tt.wantPassword {
				t.Fatalf("password = %q, want %q", password, tt.wantPassword)
			}
			// lib/pq must understand every parameter we add.
			if _, err := pq.NewConnector(prepared); err != nil {
				t.Fatalf("lib/pq rejects prepared URL: %v", err)
			}
		})
	}
}

func TestOpenRejectsUnsupportedDatabaseURL(t *testing.T) {
	if _, err := Open(""); err == nil {
		t.Fatal("expected empty DSN to be rejected")
	}
	if _, err := Open("mysql://user:pass@localhost/eneba"); err == nil ||
		!strings.Contains(err.Error(), "postgres") {
		t.Fatalf("expected a postgres-specific scheme error, got %v", err)
	}
}
