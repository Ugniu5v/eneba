package ids

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strings"
	"time"
)

const crockford = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func randomBytes(n int) []byte {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic("crypto/rand unavailable: " + err.Error())
	}
	return b
}

func New(prefix string) string {
	return prefix + "_" + hex.EncodeToString(randomBytes(9))
}

func SessionToken() string {
	return base64.RawURLEncoding.EncodeToString(randomBytes(32))
}

func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func DigitalKey() string {
	raw := randomBytes(15)
	var b strings.Builder
	for i, v := range raw {
		if i > 0 && i%5 == 0 {
			b.WriteByte('-')
		}
		b.WriteByte(crockford[int(v)%len(crockford)])
	}
	return b.String()
}

func OrderNumber(now time.Time) string {
	b := randomBytes(5)
	var suffix strings.Builder
	for _, v := range b {
		suffix.WriteByte(crockford[int(v)%len(crockford)])
	}
	return "ENB-" + now.UTC().Format("06") + "-" + suffix.String()
}
