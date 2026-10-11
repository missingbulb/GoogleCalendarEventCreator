package checks

import (
	"encoding/json"
	"strings"
	"testing"
)

func pkg(scripts map[string]string) string {
	b, _ := json.Marshal(map[string]any{"scripts": scripts})
	return string(b)
}

func offline(listed ...string) string {
	return pkg(map[string]string{"test:offline": "node --test " + strings.Join(listed, " ")})
}

func TestTestOfflineListSync(t *testing.T) {
	fs := run(t, testOfflineListSync, map[string]string{
		"extension-test/a.test.js": "", "extension-test/b.test.js": "",
		"package.json": offline("extension-test/a.test.js"),
	})
	expect(t, "a mirror test missing from the list", fs, "package.json")
	saysAll(t, "missing", fs, "test:offline is missing extension-test/b.test.js")

	fs = run(t, testOfflineListSync, map[string]string{
		"extension-test/a.test.js": "",
		"package.json":             offline("extension-test/a.test.js", "extension-test/gone.test.js"),
	})
	expect(t, "a listed file that does not exist", fs, "package.json")
	saysAll(t, "gone", fs, "extension-test/gone.test.js, which does not exist")

	expect(t, "list and tree agree, non-mirror entries ignored", run(t, testOfflineListSync, map[string]string{
		"extension-test/a.test.js": "", "dev/build/test/other.test.js": "",
		"package.json": offline("extension-test/a.test.js", "dev/build/release/shipping-files.test.js"),
	}), "")
	expect(t, "no test:offline script", run(t, testOfflineListSync, map[string]string{
		"extension-test/a.test.js": "", "package.json": `{"scripts":{}}`,
	}), "")
	expect(t, "a malformed package.json", run(t, testOfflineListSync, map[string]string{
		"extension-test/a.test.js": "", "package.json": `{`,
	}), "")
}

func TestCustomSourcesFlat(t *testing.T) {
	fs := run(t, customSourcesFlat, map[string]string{
		"extension/event-extractors/custom/barby.js":             "",
		"extension/event-extractors/custom/shared/util.js":       "",
		"extension/event-extractors/custom/README.md":            "",
		"extension/event-extractors/custom/generic-extractor.js": "",
	})
	expect(t, "a subdirectory, a non-source file and a pipeline file", fs,
		"extension/event-extractors/custom/README.md extension/event-extractors/custom/generic-extractor.js extension/event-extractors/custom/shared/util.js")
	saysAll(t, "the three kinds", fs, "is not a per-site source", "is a pipeline file", "sits in a subdirectory",
		"move generic-extractor.js back to extension/event-extractors/")

	expect(t, "a flat tree of per-site sources beside the pipeline", run(t, customSourcesFlat, map[string]string{
		"extension/event-extractors/custom/barby.js":           "",
		"extension/event-extractors/custom/tel-aviv.js":        "",
		"extension/event-extractors/generic-extractor.js":      "",
		"extension/event-extractors/registry.js":               "",
		"extension/event-extractors/helpers/dates.js":          "",
		"extension/event-extractors/load-order.generated.json": "",
	}), "")
}

// The real shape of both scripts, quoted globs included.
var globScripts = map[string]string{
	"test":     `node --disable-warning=X --test "extension-test/**/*.test.js" "dev/build/test/**/*.test.js" ".claudinite/local/packs/**/*.test.mjs" "dev/requirements/logic/**/*.test.js" dev/requirements/requirements-coverage.test.js`,
	"test:e2e": `node --test "dev/requirements/heavy/**/*.test.js"`,
}

func globTree(scripts map[string]string, files ...string) map[string]string {
	tree := map[string]string{"package.json": pkg(scripts)}
	for _, f := range files {
		tree[f] = ""
	}
	return tree
}

func TestNpmTestGlobCoverage(t *testing.T) {
	fs := run(t, npmTestGlobCoverage, globTree(globScripts, "extension-test/host-policy.test.js", "dev/security/csp.test.js"))
	expect(t, "a test file no pattern reaches", fs, "dev/security/csp.test.js")
	saysAll(t, "unreached", fs, "reached by no pattern")

	expect(t, "every pattern shape reaches its files", run(t, npmTestGlobCoverage, globTree(globScripts,
		"extension-test/host-policy.test.js", // `**/` matches zero directories too
		"extension-test/events-popup/popup.test.js",
		"dev/build/test/load-order-generated.test.js",
		".claudinite/local/packs/gcec/x.test.mjs", // .mjs counts as a test file
		"dev/requirements/logic/product-requirements.test.js",
		"dev/requirements/requirements-coverage.test.js", // a literal path, not a glob
		"extension/host-policy.js",
	)), "")

	heavy := "dev/requirements/heavy/extension-load.chrome.test.js"
	expect(t, "the e2e suite exempt via test:e2e", run(t, npmTestGlobCoverage, globTree(globScripts, heavy)), "")
	expect(t, "the carve-out gone with test:e2e", run(t, npmTestGlobCoverage,
		globTree(map[string]string{"test": globScripts["test"]}, heavy)), heavy)

	expect(t, "a test script that is not a node --test runner", run(t, npmTestGlobCoverage,
		globTree(map[string]string{"test": "jest"}, "dev/security/csp.test.js")), "")

	expect(t, "a directory argument recurses", run(t, npmTestGlobCoverage,
		globTree(map[string]string{"test": "node --test dev/security/"}, "dev/security/deep/csp.test.js")), "")
}

var hosts = `{"supportedDomains":["stubhub.com","tel-aviv.gov.il","visit.tel-aviv.gov.il","lu.ma"]}`

func pipelineTree(files map[string]string) map[string]string {
	return with(files, map[string]string{"extension/host-lists.json": hosts})
}

func TestPipelineSiteAgnostic(t *testing.T) {
	fs := run(t, pipelineSiteAgnostic, pipelineTree(map[string]string{
		"extension/event-extractors/generic-extractor.js":       "function read(doc) {\n  if (host.endsWith(\"stubhub.com\")) return special(doc);\n  return generic(doc);\n}\n",
		"extension/event-extractors/helpers/derive-timezone.js": "const OVERRIDE = { \"visit.tel-aviv.gov.il\": \"Asia/Jerusalem\" };\n",
	}))
	expect(t, "a host in the generic extractor and in a helper", fs,
		"extension/event-extractors/generic-extractor.js:2 extension/event-extractors/helpers/derive-timezone.js:1")
	// The longest matching entry wins, not the one it contains.
	saysAll(t, "hosts named", fs, "names the supported site stubhub.com", "names the supported site visit.tel-aviv.gov.il")

	fs = run(t, pipelineSiteAgnostic, pipelineTree(map[string]string{
		"extension/event-extractors/assemble-events.js": "const FEED = \"https://lu.ma/api/events\";\n",
	}))
	expect(t, "a host in a URL string, whose // is no comment", fs, "extension/event-extractors/assemble-events.js:1")
	saysAll(t, "lu.ma", fs, "lu.ma")

	expect(t, "sites cited only in comments, or living in custom/", run(t, pipelineSiteAgnostic, pipelineTree(map[string]string{
		"extension/event-extractors/generic-extractor.js": "// or is merely the site's domain (\"stubhub.com\" is not a venue).\n" +
			"/* seen on visit.tel-aviv.gov.il\n   and lu.ma */\n" +
			"const venue = readVenue(doc); // not stubhub.com-specific\n",
		"extension/event-extractors/custom/stubhub.js":         "GCal.sources.push({ matches: (h) => /(^|\\.)stubhub\\.com$/.test(h) });\n",
		"extension/event-extractors/helpers/text.js":           "const s = \"notstubhub.combo\";\n",
		"extension/event-extractors/load-order.generated.json": `["stubhub.com"]`,
	})), "")

	fs = run(t, pipelineSiteAgnostic, pipelineTree(map[string]string{
		"extension/event-extractors/registry.js": "const both = [\"lu.ma\", \"stubhub.com\"];\n",
	}))
	expect(t, "two hosts on one line", fs, "extension/event-extractors/registry.js:1")
	saysAll(t, "the longest host is the one named", fs, "names the supported site stubhub.com")

	tree := map[string]string{"extension/event-extractors/generic-extractor.js": "if (h === \"stubhub.com\") {}\n"}
	expect(t, "no host list", run(t, pipelineSiteAgnostic, tree), "")
	expect(t, "an empty host list", run(t, pipelineSiteAgnostic,
		with(tree, map[string]string{"extension/host-lists.json": `{"supportedDomains":[]}`})), "")
}

// The live repo's list, in shape, is the clean baseline the cases vary.
var gitattributes = strings.Join([]string{
	"# Generated/derived files — regenerated by `npm run regen`, never hand-merged.",
	"# extension/event-extractors/not-a-real-entry.json merge=ours   <- a comment, not an entry",
	"dev/requirements/extractor/data/**/*.html linguist-vendored",
	"extension/event-extractors/load-order.generated.json                merge=ours",
	"dev/requirements/extractor/generic-coverage/generic-coverage.baseline.GENERATED.json   merge=ours",
	"dev/requirements/popup/cases/*.png                                              merge=ours",
	"dev/requirements/icon/cases/*.png                                               merge=ours",
}, "\n")

func attrTree(attrs string, files ...string) map[string]string {
	tree := map[string]string{".gitattributes": attrs}
	for _, f := range files {
		tree[f] = ""
	}
	return tree
}

func TestRegenArtifactsMergeOurs(t *testing.T) {
	fs := run(t, regenArtifactsMergeOurs, attrTree(gitattributes,
		"dev/requirements/badge/cases/badge-states.12.1.png",
		"extension/event-extractors/second-list.generated.json"))
	expect(t, "a new image kind's snapshots and an unlisted generated file", fs,
		"dev/requirements/badge/cases/badge-states.12.1.png extension/event-extractors/second-list.generated.json")
	// The fix names the directory glob for a snapshot, the file itself otherwise.
	saysAll(t, "fixes", fs, "`dev/requirements/badge/cases/*.png merge=ours`",
		"`extension/event-extractors/second-list.generated.json merge=ours`")

	expect(t, "the repo's real artifact set", run(t, regenArtifactsMergeOurs, attrTree(gitattributes,
		"extension/event-extractors/load-order.generated.json",
		"dev/requirements/popup/cases/count-label.8.1.png",
		"dev/requirements/icon/cases/toolbar-icon.10.1.png",
		"extension/events-popup/popup.js",
		"dev/build/release/store_artifacts/chrome-store-screenshot-1280x800.png",
	)), "")

	expect(t, "a GENERATED-marked file is the canon rule's", run(t, regenArtifactsMergeOurs, attrTree(
		"# nothing on the ours driver here",
		"dev/requirements/extractor/generic-coverage/generic-coverage.GENERATED.md")), "")

	expect(t, "a basename-only pattern matches at any depth", run(t, regenArtifactsMergeOurs,
		attrTree("*.png merge=ours", "dev/requirements/popup/cases/count-label.8.1.png")), "")
	deeper := "extension/event-extractors/load-order.generated.json"
	expect(t, "a single * stops at the separator", run(t, regenArtifactsMergeOurs,
		attrTree("extension/*.generated.json merge=ours", deeper)), deeper)
	expect(t, "** crosses it", run(t, regenArtifactsMergeOurs,
		attrTree("extension/**/*.generated.json merge=ours", deeper)), "")

	expect(t, "no regen artifacts", run(t, regenArtifactsMergeOurs, attrTree(gitattributes, "extension/events-popup/popup.js")), "")
}

// The scope as each gate spells it, one unbroken literal per side.
const scope = `^(extension/event-extractors/generic-extractor\.js|extension/event-extractors/helpers/[^/]+\.js|extension-test/event-extractors/extraction\.test\.js|dev/requirements/extractor/generic-coverage/generic-coverage\.(baseline\.GENERATED\.json|GENERATED\.md))$`

func rulesJSON(pattern string) string {
	b, _ := json.Marshal([]map[string]any{{
		"name": "generic-coverage-scope", "pathMatching": "/" + pattern + "/",
		"changeKinds": []string{"added", "modified"}, "editShape": "any",
	}})
	return string(b)
}

func shellScript(pattern string) string {
	return "set -uo pipefail\n# ── 1. SCOPE ──\nallowed='" + pattern + "'\nnpm test\n"
}

func scopeTree(rules, shell string) map[string]string {
	tree := map[string]string{}
	if rules != "" {
		tree[scopeRulesFile] = rules
	}
	if shell != "" {
		tree[scopePostconditions] = shell
	}
	return tree
}

func TestGenericCoverageScopeAgrees(t *testing.T) {
	fs := run(t, genericCoverageScopeAgrees, scopeTree(rulesJSON(scope), shellScript(`^(extension/.*)$`)))
	expect(t, "one gate widened alone", fs, scopeRulesFile)
	saysAll(t, "widened", fs, "describe different file sets", "postconditions.sh: ^(extension/.*)$")

	fs = run(t, genericCoverageScopeAgrees, scopeTree(rulesJSON(scope), "allowed=$(build_it)\n"))
	expect(t, "no single allowed= line", fs, scopePostconditions)
	saysAll(t, "no line", fs, "declares no single-line")

	fs = run(t, genericCoverageScopeAgrees, scopeTree(`[{"name":"generic-coverage-scope","pathMatching":"not a regex"}]`, shellScript(scope)))
	expect(t, "a pathMatching that is no /pattern/", fs, scopeRulesFile)
	saysAll(t, "not a regex", fs, "merge-rules.json:  (not a /pattern/ regex string)")

	expect(t, "identical literals", run(t, genericCoverageScopeAgrees, scopeTree(rulesJSON(scope), shellScript(scope))), "")
	expect(t, "identical literals, CRLF", run(t, genericCoverageScopeAgrees,
		scopeTree(rulesJSON(scope), strings.ReplaceAll(shellScript(scope), "\n", "\r\n"))), "")
	expect(t, "no merge-rules.json", run(t, genericCoverageScopeAgrees, scopeTree("", shellScript(scope))), "")
	expect(t, "no postconditions.sh", run(t, genericCoverageScopeAgrees, scopeTree(rulesJSON(scope), "")), "")
	expect(t, "no such rule", run(t, genericCoverageScopeAgrees, scopeTree("[]", shellScript(`^(extension/.*)$`))), "")
	expect(t, "malformed rules", run(t, genericCoverageScopeAgrees, scopeTree("not json", shellScript(`^(extension/.*)$`))), "")
}
