package checks

import (
	"encoding/json"
	"regexp"

	"claudinite.com/checksdk"
)

// The generic-coverage routine's file scope is written twice, byte for
// byte: as the ERE `allowed=` its postconditions.sh executes, and as the
// pathMatching of merge-rules.json's generic-coverage-scope rule, which
// the auto-merge policy re-measures against the pushed diff. A shell
// literal and a JSON regex string cannot share a constant, so this check
// keeps the two equal. Only the path set is compared: changeKinds omitting
// `deleted` is a decision, not drift.
const (
	scopeRulesFile      = ".claudinite/local/packs/gcec/merge-rules.json"
	scopePostconditions = ".claudinite/local/packs/gcec/tasks/generic-extractor-improvements/postconditions.sh"
	scopeRuleName       = "generic-coverage-scope"
	scopeWhy            = "the two gates that hold the generic-coverage routine to its file scope read separate copies of " +
		"the same pattern — one widened alone silently lets an out-of-scope diff auto-merge"
)

var (
	// regexLiteral is the /body/flags form the policy engine parses;
	// greedy, so the delimiter is the last slash.
	regexLiteral = regexp.MustCompile(`(?s)^/(.*)/([a-z]*)$`)
	allowedLine  = regexp.MustCompile(`^allowed='(.*)'$`)
	// lineBreak is every JavaScript line terminator, which a multiline
	// ^ and $ stop at.
	lineBreak = regexp.MustCompile("\r\n|[\n\r  ]")
)

func init() {
	checksdk.Register(checksdk.Check{
		ID:   "generic-coverage-scope-agrees",
		Tags: []string{"world"},
		Doc:  doc,
		Why:  scopeWhy,
		Run:  genericCoverageScopeAgrees,
	})
}

func genericCoverageScopeAgrees(repo checksdk.Repo) []checksdk.Finding {
	rulesText, ok := readNonEmpty(repo, scopeRulesFile)
	if !ok {
		return nil
	}
	shellText, ok := readNonEmpty(repo, scopePostconditions)
	if !ok {
		return nil
	}
	// A broken merge-rules.json fails every policy naming its rules where
	// the policy is evaluated; nothing to add here.
	var rules []any
	if json.Unmarshal([]byte(rulesText), &rules) != nil {
		return nil
	}
	var declared map[string]any
	for _, r := range rules {
		if m, ok := r.(map[string]any); ok && m["name"] == scopeRuleName {
			declared = m
			break
		}
	}
	if declared == nil {
		return nil
	}

	fromRules, rulesOK := "", false
	if raw, ok := declared["pathMatching"].(string); ok {
		if m := regexLiteral.FindStringSubmatch(raw); m != nil {
			fromRules, rulesOK = m[1], true
		}
	}
	fromShell, shellOK := "", false
	for _, line := range lineBreak.Split(shellText, -1) {
		if m := allowedLine.FindStringSubmatch(line); m != nil {
			fromShell, shellOK = m[1], true
			break
		}
	}
	if !shellOK {
		return []checksdk.Finding{{
			Path:     scopePostconditions,
			Sentence: scopePostconditions + " declares no single-line `allowed='…'` scope pattern for this check to compare",
			Fix:      "keep the scope pattern on one `allowed='…'` line, so " + scopeRulesFile + "'s copy can be checked against it",
		}}
	}
	if rulesOK && fromRules == fromShell {
		return nil
	}
	shown := fromRules
	if !rulesOK {
		shown = "(not a /pattern/ regex string)"
	}
	return []checksdk.Finding{{
		Path:     scopeRulesFile,
		Sentence: scopeRuleName + "'s pathMatching and " + scopePostconditions + "'s `allowed=` describe different file sets",
		Fix: "make the two literals identical — " + scopeRuleName + ".pathMatching is `/` + the `allowed=` value + `/`.\n" +
			"  postconditions.sh: " + fromShell + "\n" +
			"  merge-rules.json:  " + shown,
	}}
}
