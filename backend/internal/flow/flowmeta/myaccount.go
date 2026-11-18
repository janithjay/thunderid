// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

package flowmeta

import (
	"encoding/json"
	"maps"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"

	i18nmgt "github.com/thunder-id/thunderid/internal/system/i18n/mgt"
)

// My Account reads how it is laid out from its application's metadata, under myAccountMetadataKey. The
// application API stores metadata as given, so the layout is checked here before it is served.
const (
	// applicationMetadataProperty is the inbound client property that holds the application's metadata.
	applicationMetadataProperty = "metadata"
	// myAccountMetadataKey is the metadata key that holds the My Account layout.
	myAccountMetadataKey = "myAccount"
	// myAccountNamespace is the translation namespace My Account reads its text from.
	myAccountNamespace = "myaccount"
)

// The section types My Account can show.
const (
	sectionHomePersonalInfo    = "home.personalInfo"
	sectionHomeSecurityCheckup = "home.securityCheckup"
	sectionHomeDevices         = "home.devices"
	sectionHomeApps            = "home.apps"
	sectionProfile             = "profile"
	sectionCredential          = "credential"
	sectionPasskeys            = "passkeys"
	sectionSessions            = "sessions"
	sectionWidget              = "widget"
)

// tabHome is the ID of the Home tab, the only tab that shows the home section types.
const tabHome = "home"

// Limits that keep the layout small, since My Account reads it on every page load.
const (
	maxMyAccountTabs       = 12
	maxSectionsPerTab      = 20
	maxTextLanguages       = 30
	maxTextKeysPerLanguage = 300
	maxTextKeyLength       = 128
	maxTextValueLength     = 500
	maxWidgetBlocks        = 10
	maxWidgetURLLength     = 2048
	widgetURLScheme        = "https"
)

// The blocks a widget is built from. Images and buttons point at an https address; headings and text have none.
const (
	blockHeading = "heading"
	blockText    = "text"
	blockImage   = "image"
	blockButton  = "button"
)

var (
	myAccountItemIDPattern     = regexp.MustCompile(`^[a-z][a-z0-9-]{0,31}$`)
	credentialAttributePattern = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_]{0,63}$`)
	textLanguagePattern        = regexp.MustCompile(`^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$`)
	textKeyPattern             = regexp.MustCompile(`^[A-Za-z0-9_.-]+$`)

	builtInTabs  = map[string]struct{}{tabHome: {}, "personal": {}, "security": {}, "devices": {}}
	homeSections = map[string]struct{}{
		sectionHomePersonalInfo: {}, sectionHomeSecurityCheckup: {}, sectionHomeDevices: {}, sectionHomeApps: {},
	}
	tabSections = map[string]struct{}{sectionProfile: {}, sectionPasskeys: {}, sectionSessions: {}}
	tabIcons    = map[string]struct{}{"info": {}, "help": {}, "link": {}, "star": {}, "settings": {}, "bell": {}}
	// reservedTabIDs are paths of My Account's own files: a tab's address is /<my_account.path>/<tab ID>.
	reservedTabIDs = map[string]struct{}{"assets": {}}
)

// MyAccountTab is a tab of My Account: a built-in one, or a custom one named in the text. Its icon is one of
// My Account's named icons, or an image at an https address.
type MyAccountTab struct {
	ID       string             `json:"id"`
	Custom   bool               `json:"custom,omitempty"`
	Hidden   bool               `json:"hidden,omitempty"`
	Icon     string             `json:"icon,omitempty"`
	IconURL  string             `json:"iconUrl,omitempty"`
	Sections []MyAccountSection `json:"sections"`
}

// MyAccountSection is a component in a tab. A hidden one stays in the layout for the editor, and My Account
// leaves it out.
type MyAccountSection struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Attribute string                 `json:"attribute,omitempty"`
	Blocks    []MyAccountWidgetBlock `json:"blocks,omitempty"`
	Hidden    bool                   `json:"hidden,omitempty"`
}

// MyAccountWidgetBlock is one block of a widget section. Its text is the layout's text for
// sections.<section ID>.<block ID>.
type MyAccountWidgetBlock struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	URL  string `json:"url,omitempty"`
}

// myAccountLayout is the layout as the application's metadata holds it: the tabs, and the text by language.
type myAccountLayout struct {
	Tabs []MyAccountTab               `json:"tabs"`
	Text map[string]map[string]string `json:"text"`
}

// readMyAccountLayout reads the My Account layout from an application's inbound client properties. It reports
// false when the application has none, or when the one it has is not a valid layout.
func readMyAccountLayout(props map[string]interface{}) (myAccountLayout, bool) {
	metadata, ok := props[applicationMetadataProperty].(map[string]interface{})
	if !ok {
		return myAccountLayout{}, false
	}
	value, ok := metadata[myAccountMetadataKey]
	if !ok {
		return myAccountLayout{}, false
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return myAccountLayout{}, false
	}
	var layout myAccountLayout
	if err := json.Unmarshal(raw, &layout); err != nil {
		return myAccountLayout{}, false
	}
	return layout, isValidMyAccountLayout(layout)
}

// isValidMyAccountLayout reports whether a layout can be served: at least one visible tab, each tab and
// section well formed and unique, every widget address https, and the text within its limits.
func isValidMyAccountLayout(layout myAccountLayout) bool {
	if len(layout.Tabs) == 0 || len(layout.Tabs) > maxMyAccountTabs {
		return false
	}
	seenTabs := make(map[string]struct{}, len(layout.Tabs))
	seenSections := make(map[string]struct{})
	visible := false
	for _, tab := range layout.Tabs {
		if !isValidMyAccountTab(tab) {
			return false
		}
		if _, seen := seenTabs[tab.ID]; seen {
			return false
		}
		seenTabs[tab.ID] = struct{}{}
		visible = visible || !tab.Hidden
		for _, section := range tab.Sections {
			if _, seen := seenSections[section.ID]; seen || !isValidMyAccountSection(tab.ID, section) {
				return false
			}
			seenSections[section.ID] = struct{}{}
		}
	}
	return visible && isValidMyAccountText(layout.Text)
}

// isValidMyAccountTab reports whether a tab is well formed, without its sections' content.
func isValidMyAccountTab(tab MyAccountTab) bool {
	_, builtIn := builtInTabs[tab.ID]
	_, reserved := reservedTabIDs[tab.ID]
	if tab.Custom == builtIn || reserved || !myAccountItemIDPattern.MatchString(tab.ID) ||
		len(tab.Sections) > maxSectionsPerTab {
		return false
	}
	if tab.IconURL != "" && !isHTTPSURL(tab.IconURL) {
		return false
	}
	if tab.Icon == "" {
		return true
	}
	_, known := tabIcons[tab.Icon]
	return known
}

// isValidMyAccountSection reports whether a section is well formed and its tab can show it.
func isValidMyAccountSection(tabID string, section MyAccountSection) bool {
	if !myAccountItemIDPattern.MatchString(section.ID) {
		return false
	}
	switch section.Type {
	case sectionWidget:
		return section.Attribute == "" && isValidWidgetBlocks(section.Blocks)
	case sectionCredential:
		return tabID != tabHome && len(section.Blocks) == 0 && credentialAttributePattern.MatchString(section.Attribute)
	}
	if section.Attribute != "" || len(section.Blocks) > 0 {
		return false
	}
	_, home := homeSections[section.Type]
	_, other := tabSections[section.Type]
	return (tabID == tabHome && home) || (tabID != tabHome && other)
}

// isValidWidgetBlocks reports whether a widget has at least one block and at most maxWidgetBlocks, each with a
// unique ID, a known type, and an https address exactly when it is an image or a button.
func isValidWidgetBlocks(blocks []MyAccountWidgetBlock) bool {
	if len(blocks) == 0 || len(blocks) > maxWidgetBlocks {
		return false
	}
	seen := make(map[string]struct{}, len(blocks))
	for _, block := range blocks {
		if _, dup := seen[block.ID]; dup || !myAccountItemIDPattern.MatchString(block.ID) {
			return false
		}
		seen[block.ID] = struct{}{}
		switch block.Type {
		case blockImage, blockButton:
			if !isHTTPSURL(block.URL) {
				return false
			}
		case blockHeading, blockText:
			if block.URL != "" {
				return false
			}
		default:
			return false
		}
	}
	return true
}

// isValidMyAccountText reports whether the text's languages, keys and values are within their limits.
func isValidMyAccountText(text map[string]map[string]string) bool {
	if len(text) > maxTextLanguages {
		return false
	}
	for language, values := range text {
		if !textLanguagePattern.MatchString(language) || len(values) > maxTextKeysPerLanguage {
			return false
		}
		for key, value := range values {
			if len(key) > maxTextKeyLength || !textKeyPattern.MatchString(key) ||
				utf8.RuneCountInString(value) > maxTextValueLength {
				return false
			}
		}
	}
	return true
}

// isHTTPSURL reports whether value is an absolute https address with a host.
func isHTTPSURL(value string) bool {
	if value == "" || len(value) > maxWidgetURLLength {
		return false
	}
	parsed, err := url.Parse(value)
	return err == nil && parsed.Scheme == widgetURLScheme && parsed.Host != ""
}

// mergeMyAccountText adds the layout's text over My Account's translations, when the response carries that
// namespace. The text for the response's language wins, then the text for its base language (en for en-GB), then
// the text for the system language, so a browser in a language the layout has no text for still gets the
// layout's own text instead of the tab IDs.
func mergeMyAccountText(response *FlowMetadataResponse, text map[string]map[string]string, ns string) {
	if ns != "" && ns != myAccountNamespace {
		return
	}
	language := response.I18n.Language
	layers := []string{i18nmgt.SystemLanguage}
	if base, _, found := strings.Cut(language, "-"); found {
		layers = append(layers, base)
	}
	layers = append(layers, language)

	values := make(map[string]string)
	for _, layer := range layers {
		maps.Copy(values, text[layer])
	}
	if len(values) == 0 {
		return
	}
	if response.I18n.Translations == nil {
		response.I18n.Translations = make(map[string]map[string]string)
	}
	merged := make(map[string]string, len(response.I18n.Translations[myAccountNamespace])+len(values))
	maps.Copy(merged, response.I18n.Translations[myAccountNamespace])
	maps.Copy(merged, values)
	response.I18n.Translations[myAccountNamespace] = merged
}
