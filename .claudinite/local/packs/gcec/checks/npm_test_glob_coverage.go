package checks

import (
	"regexp"
	"strings"

	"claudinite.com/checksdk"
)

// `npm test` is one `node --test` over a hand-kept list of globs, and node
// never errors on a glob matching nothing, so every committed test file
// must be reached by one of them. The heavy CI-only suite is the one
// carve-out, read from scripts["test:e2e"]. Only the silent direction is
// checked: a stale literal path fails node --test loudly on its own.
const npmTestWhy = "node --test never errors on a glob that matches nothing — a test file no pattern " +
	"reaches silently never runs, and npm test still exits 0"

var (
	testFile     = regexp.MustCompile(`\.test\.(js|mjs|cjs)$`)
	testFlag     = regexp.MustCompile(`(^|\s)--test(\s|$)`)
	hasWildcard  = regexp.MustCompile(`[*?]`)
	hasExtension = regexp.MustCompile(`(?i)\.[a-z0-9]+$`)
)

func init() {
	checksdk.Register(checksdk.Check{
		ID:   "npm-test-glob-coverage",
		Tags: []string{"world"},
		Doc:  doc,
		Why:  npmTestWhy,
		Run:  npmTestGlobCoverage,
	})
}

// runnerPatterns are the file and glob arguments of a `node --test`
// script, quotes off, the binary and every flag dropped; nil for anything
// that is not a glob-driven runner.
func runnerPatterns(script any) []string {
	s, ok := script.(string)
	if !ok || !testFlag.MatchString(s) {
		return nil
	}
	var out []string
	for _, t := range fields(s) {
		if strings.HasPrefix(t, `'`) || strings.HasPrefix(t, `"`) {
			t = t[1:]
		}
		if strings.HasSuffix(t, `'`) || strings.HasSuffix(t, `"`) {
			t = t[:len(t)-1]
		}
		if t != "" && t != "node" && !strings.HasPrefix(t, "-") {
			out = append(out, t)
		}
	}
	return out
}

// globMatcher matches per path segment: `**` alone as a segment spans
// directories (zero included), `*` and `?` stay in one segment. A pattern
// with no wildcard and no extension is a directory node --test recurses.
func globMatcher(pattern string) func(string) bool {
	p := strings.TrimRight(pattern, "/")
	if !hasWildcard.MatchString(p) && !hasExtension.MatchString(p) {
		return func(f string) bool { return f == p || strings.HasPrefix(f, p+"/") }
	}
	const starStar = "\x00"
	segs := strings.Split(p, "/")
	for i, seg := range segs {
		if seg == "**" {
			segs[i] = starStar
			continue
		}
		var b strings.Builder
		for _, r := range seg {
			switch {
			case strings.ContainsRune(`.+^${}()|[]\`, r):
				b.WriteByte('\\')
				b.WriteRune(r)
			case r == '*':
				b.WriteString("[^/]*")
			case r == '?':
				b.WriteString("[^/]")
			default:
				b.WriteRune(r)
			}
		}
		segs[i] = b.String()
	}
	source := strings.Join(segs, "/")
	source = strings.ReplaceAll(source, starStar+"/", "(?:.*/)?")
	source = strings.ReplaceAll(source, "/"+starStar, "(?:/.*)?")
	source = strings.ReplaceAll(source, starStar, ".*")
	re, err := regexp.Compile("^" + source + "$")
	if err != nil {
		return func(string) bool { return false }
	}
	return re.MatchString
}

func matchers(patterns []string) []func(string) bool {
	var out []func(string) bool
	for _, p := range patterns {
		out = append(out, globMatcher(p))
	}
	return out
}

func anyMatch(ms []func(string) bool, file string) bool {
	for _, m := range ms {
		if m(file) {
			return true
		}
	}
	return false
}

func npmTestGlobCoverage(repo checksdk.Repo) []checksdk.Finding {
	scripts := packageScripts(repo)
	covered := matchers(runnerPatterns(scripts["test"]))
	if len(covered) == 0 {
		return nil
	}
	exempt := matchers(runnerPatterns(scripts["test:e2e"]))
	var out []checksdk.Finding
	for _, file := range repo.Files() {
		if !testFile.MatchString(file) || anyMatch(covered, file) || anyMatch(exempt, file) {
			continue
		}
		out = append(out, checksdk.Finding{
			Path:     file,
			Sentence: file + " is reached by no pattern in package.json's `test` script",
			Fix: "add a glob covering it to the `test` script in package.json — or, if it is a heavy " +
				"CI-only test, to `test:e2e` (which this check reads as the declared carve-out)",
		})
	}
	return out
}
