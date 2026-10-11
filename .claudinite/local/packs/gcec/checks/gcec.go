package checks

import (
	"encoding/json"
	"regexp"

	"claudinite.com/checksdk"
)

// doc is the page every gcec check points a finding at.
const doc = ".claudinite/local/packs/gcec/RULES.md"

// readNonEmpty is rel's text, false when it is absent or empty: the
// checks treat an empty file as having nothing to judge.
func readNonEmpty(repo checksdk.Repo, rel string) (string, bool) {
	text, ok := repo.Read(rel)
	if !ok || text == "" {
		return "", false
	}
	return text, true
}

// packageScripts is package.json's scripts object, nil when the file is
// absent, empty, malformed or carries none: a malformed package.json
// breaks npm first, so it is never a check's finding.
func packageScripts(repo checksdk.Repo) map[string]any {
	raw, ok := readNonEmpty(repo, "package.json")
	if !ok {
		return nil
	}
	var pkg map[string]any
	if json.Unmarshal([]byte(raw), &pkg) != nil {
		return nil
	}
	scripts, _ := pkg["scripts"].(map[string]any)
	return scripts
}

// whitespace is a run of JavaScript's \s, which the scripts are split on.
var whitespace = regexp.MustCompile(`[\t\n\v\f\r \x{a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}]+`)

// fields splits s on whitespace runs, dropping the empty ends.
func fields(s string) []string {
	var out []string
	for _, t := range whitespace.Split(s, -1) {
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}
