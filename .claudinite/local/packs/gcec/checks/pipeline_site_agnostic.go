package checks

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"claudinite.com/checksdk"
)

// The shared extraction pipeline, everything under event-extractors/ but
// custom/, runs on every page, so it names no supported site: a host-gated
// special case there makes the generic-coverage gate report the site as
// gap-free. The hosts are read from host-lists.json's supportedDomains.
// Only the obvious carrier is caught, a host literal in code; comments are
// blanked first, since citing a site as evidence for a generic rule is how
// this codebase documents one.
const (
	pipelineDir      = "extension/event-extractors/"
	pipelineHostList = "extension/host-lists.json"
	pipelineWhy      = "the shared pipeline runs on every page — a host-gated special case there makes the " +
		"generic-coverage gate report that site as gap-free when the gap was only hardcoded " +
		"away, and every suite stays green while it happens"
)

func init() {
	checksdk.Register(checksdk.Check{
		ID:   "pipeline-site-agnostic",
		Tags: []string{"world"},
		Doc:  doc,
		Why:  pipelineWhy,
		Run:  pipelineSiteAgnostic,
	})
}

// blankComments blanks every // and /* */ comment, keeping the length and
// line breaks so line numbers stay true; a // inside a string literal
// ('https://…') is code, where a host literal would hide.
func blankComments(src string) string {
	out := make([]byte, 0, len(src))
	blank := func(c byte) {
		if c == '\n' {
			out = append(out, '\n')
		} else {
			out = append(out, ' ')
		}
	}
	at := func(i int) byte {
		if i < len(src) {
			return src[i]
		}
		return 0
	}
	for i := 0; i < len(src); {
		c, next := src[i], at(i+1)
		switch {
		case c == '/' && next == '/':
			for i < len(src) && src[i] != '\n' {
				blank(src[i])
				i++
			}
		case c == '/' && next == '*':
			blank(src[i])
			blank(src[i+1])
			i += 2
			for i < len(src) && !(src[i] == '*' && at(i+1) == '/') {
				blank(src[i])
				i++
			}
			if i < len(src) {
				blank(src[i])
				i++
				if i < len(src) {
					blank(src[i])
					i++
				}
			}
		case c == '"' || c == '\'' || c == '`':
			out = append(out, c)
			i++
			for i < len(src) {
				if src[i] == '\\' {
					out = append(out, src[i])
					i++
					if i < len(src) {
						out = append(out, src[i])
						i++
					}
					continue
				}
				if src[i] == c {
					out = append(out, src[i])
					i++
					break
				}
				out = append(out, src[i])
				i++
			}
		default:
			out = append(out, c)
			i++
		}
	}
	return string(out)
}

func hostChar(c byte) bool {
	return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '.' || c == '-'
}

// namesHost reports whether line holds host as a whole label run:
// "notstubhub.com" is not stubhub.com.
func namesHost(line, host string) bool {
	for from := 0; ; {
		i := strings.Index(line[from:], host)
		if i < 0 {
			return false
		}
		at := from + i
		before := at > 0 && hostChar(line[at-1])
		after := at+len(host) < len(line) && hostChar(line[at+len(host)])
		if !before && !after {
			return true
		}
		from = at + 1
	}
}

func pipelineSiteAgnostic(repo checksdk.Repo) []checksdk.Finding {
	raw, ok := readNonEmpty(repo, pipelineHostList)
	if !ok {
		return nil
	}
	var lists map[string]any
	if json.Unmarshal([]byte(raw), &lists) != nil {
		return nil
	}
	declared, _ := lists["supportedDomains"].([]any)
	var hosts []string
	for _, h := range declared {
		if s, ok := h.(string); ok && s != "" {
			hosts = append(hosts, s)
		}
	}
	if len(declared) == 0 {
		return nil
	}
	// Longest first, so a finding names visit.tel-aviv.gov.il rather than
	// the shorter entry it contains.
	sort.SliceStable(hosts, func(a, b int) bool { return len(hosts[a]) > len(hosts[b]) })

	var out []checksdk.Finding
	for _, file := range repo.Files() {
		if !strings.HasPrefix(file, pipelineDir) || strings.HasPrefix(file, customDir) || !strings.HasSuffix(file, ".js") {
			continue
		}
		src, ok := readNonEmpty(repo, file)
		if !ok {
			continue
		}
		for n, line := range strings.Split(blankComments(src), "\n") {
			for _, host := range hosts {
				if !namesHost(line, host) {
					continue
				}
				out = append(out, checksdk.Finding{
					Path:     file,
					Line:     n + 1,
					Sentence: fmt.Sprintf("%s names the supported site %s in shipped code", file, host),
					Fix: "move the " + host + "-specific handling into extension/event-extractors/custom/<site>.js " +
						"(the one extensibility point), or generalize it so the pipeline reads what the page " +
						"says about itself with no host in the condition — citing a site in a COMMENT as " +
						"evidence for a generic rule is fine and is not what this flags",
				})
				break
			}
		}
	}
	return out
}
