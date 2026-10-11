package checks

import (
	"slices"
	"strings"

	"claudinite.com/checksdk"
)

// package.json's hand-kept test:offline list names every
// extension-test/**/*.test.js that exists, and only files that exist.
// npm test discovers by glob, so a test missing here still runs there;
// what this catches is the offline suite silently thinning.
const offlineWhy = "npm test discovers by glob but test:offline is a hand-kept list — a new or " +
	"moved extension-test file silently drops out of the offline suite"

func init() {
	checksdk.Register(checksdk.Check{
		ID:   "test-offline-list-sync",
		Tags: []string{"world"},
		Doc:  doc,
		Why:  offlineWhy,
		Run:  testOfflineListSync,
	})
}

func isMirrorTest(p string) bool {
	return strings.HasPrefix(p, "extension-test/") && strings.HasSuffix(p, ".test.js")
}

func testOfflineListSync(repo checksdk.Repo) []checksdk.Finding {
	script, ok := packageScripts(repo)["test:offline"].(string)
	if !ok {
		return nil
	}
	var listed []string
	for _, t := range fields(script) {
		if isMirrorTest(t) {
			listed = append(listed, t)
		}
	}
	var out []checksdk.Finding
	for _, file := range repo.Files() {
		if isMirrorTest(file) && !slices.Contains(listed, file) {
			out = append(out, checksdk.Finding{
				Path:     "package.json",
				Sentence: "test:offline is missing " + file,
				Fix:      "add " + file + " to the test:offline list in package.json",
			})
		}
	}
	// Probed on disk, not in the walk, so a narrowed walk never reads a
	// listed file as gone.
	for _, file := range listed {
		if !repo.Exists(file) {
			out = append(out, checksdk.Finding{
				Path:     "package.json",
				Sentence: "test:offline lists " + file + ", which does not exist",
				Fix:      "remove " + file + " from the test:offline list or fix its path",
			})
		}
	}
	return out
}
