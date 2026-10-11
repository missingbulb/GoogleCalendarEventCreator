package checks

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"claudinite.com/checksdk"
)

// run is check's findings over files written under a fresh root, with the
// fake engine walking that root.
func run(t *testing.T, check func(checksdk.Repo) []checksdk.Finding, files map[string]string) []checksdk.Finding {
	t.Helper()
	root := t.TempDir()
	for rel, text := range files {
		p := filepath.Join(root, filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(text), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return check((&checksdk.Fake{}).Repo(root))
}

// at is each finding as path[:line], in report order.
func at(fs []checksdk.Finding) string {
	var out []string
	for _, f := range fs {
		s := f.Path
		if f.Line > 0 {
			s += ":" + strconv.Itoa(f.Line)
		}
		out = append(out, s)
	}
	return strings.Join(out, " ")
}

func expect(t *testing.T, name string, fs []checksdk.Finding, want string) {
	t.Helper()
	if got := at(fs); got != want {
		t.Errorf("%s: findings at %q, want %q\n%+v", name, got, want, fs)
	}
}

// said is every finding's sentence and fix, one per line.
func said(fs []checksdk.Finding) string {
	var out []string
	for _, f := range fs {
		out = append(out, f.Sentence+" | "+f.Fix)
	}
	return strings.Join(out, "\n")
}

func saysAll(t *testing.T, name string, fs []checksdk.Finding, parts ...string) {
	t.Helper()
	s := said(fs)
	for _, p := range parts {
		if !strings.Contains(s, p) {
			t.Errorf("%s: %q not in\n%s", name, p, s)
		}
	}
}

func with(files map[string]string, set map[string]string) map[string]string {
	out := map[string]string{}
	for k, v := range files {
		out[k] = v
	}
	for k, v := range set {
		out[k] = v
	}
	return out
}
