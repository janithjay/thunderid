// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

package flowmeta

import (
	"strings"
	"testing"

	"github.com/thunder-id/thunderid/pkg/thunderidengine/providers"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

const (
	// testMyAccountAppID is the application whose metadata holds a My Account layout.
	testMyAccountAppID = "my-account-app"
	// testMyAccountLanguage is the language the My Account tests resolve translations for.
	testMyAccountLanguage = "en-US"
)

// myAccountMetadataJSON is a layout as the application API stores it in an application's metadata.
func myAccountMetadataJSON() map[string]interface{} {
	return map[string]interface{}{
		"tabs": []interface{}{
			map[string]interface{}{"id": "home", "hidden": true, "sections": []interface{}{}},
			map[string]interface{}{"id": "security", "sections": []interface{}{
				map[string]interface{}{"id": "pin", "type": "credential", "attribute": "pin"},
				map[string]interface{}{"id": "passkeys", "type": "passkeys", "hidden": true},
			}},
			map[string]interface{}{"id": "help", "custom": true, "icon": "help", "sections": []interface{}{
				map[string]interface{}{"id": "docs", "type": "widget", "blocks": []interface{}{
					map[string]interface{}{"id": "title", "type": "heading"},
					map[string]interface{}{"id": "open", "type": "button", "url": "https://help.example.com"},
				}},
			}},
		},
		"text": map[string]interface{}{
			"en-US": map[string]interface{}{"tabs.help": "Help"},
		},
	}
}

func validLayout() myAccountLayout {
	return myAccountLayout{Tabs: []MyAccountTab{
		{ID: "home", Sections: []MyAccountSection{{ID: "summary", Type: sectionHomePersonalInfo}}},
		{ID: "security", Sections: []MyAccountSection{
			{ID: "password", Type: sectionCredential, Attribute: "password"}}},
		{ID: "help", Custom: true, Icon: "help", Sections: []MyAccountSection{
			{ID: "docs", Type: sectionWidget, Blocks: []MyAccountWidgetBlock{
				{ID: "title", Type: blockHeading},
				{ID: "body", Type: blockText},
				{ID: "banner", Type: blockImage, URL: "https://help.example.com/banner.png"},
				{ID: "open", Type: blockButton, URL: "https://help.example.com"},
			}}}},
	}}
}

func TestReadMyAccountLayout(t *testing.T) {
	layout, ok := readMyAccountLayout(map[string]interface{}{
		applicationMetadataProperty: map[string]interface{}{myAccountMetadataKey: myAccountMetadataJSON()},
	})

	assert.True(t, ok)
	assert.Len(t, layout.Tabs, 3)
	assert.Equal(t, MyAccountSection{ID: "pin", Type: sectionCredential, Attribute: "pin"}, layout.Tabs[1].Sections[0])
	assert.Equal(t, MyAccountSection{ID: "passkeys", Type: sectionPasskeys, Hidden: true}, layout.Tabs[1].Sections[1])
	assert.Equal(t, map[string]map[string]string{"en-US": {"tabs.help": "Help"}}, layout.Text)
}

func TestReadMyAccountLayout_Absent(t *testing.T) {
	for name, props := range map[string]map[string]interface{}{
		"no properties":       nil,
		"no metadata":         {"url": "https://example.com"},
		"metadata not an map": {applicationMetadataProperty: "x"},
		"no layout":           {applicationMetadataProperty: map[string]interface{}{"team": "a"}},
		"layout of the wrong shape": {applicationMetadataProperty: map[string]interface{}{
			myAccountMetadataKey: map[string]interface{}{"tabs": "home"}}},
	} {
		t.Run(name, func(t *testing.T) {
			_, ok := readMyAccountLayout(props)
			assert.False(t, ok)
		})
	}
}

func TestIsValidMyAccountLayout(t *testing.T) {
	assert.True(t, isValidMyAccountLayout(validLayout()))

	// Any tab can show a named icon, or an image at an https address.
	withIcons := validLayout()
	withIcons.Tabs[1].Icon = "help"
	withIcons.Tabs[0].IconURL = "https://cdn.example.com/home.svg"
	assert.True(t, isValidMyAccountLayout(withIcons))

	cases := map[string]func(layout *myAccountLayout){
		"no tabs":                func(l *myAccountLayout) { l.Tabs = nil },
		"no visible tab":         func(l *myAccountLayout) { l.Tabs = []MyAccountTab{{ID: "home", Hidden: true}} },
		"duplicate tab":          func(l *myAccountLayout) { l.Tabs = append(l.Tabs, l.Tabs[0]) },
		"unknown tab":            func(l *myAccountLayout) { l.Tabs[0].ID = "other" },
		"custom built-in":        func(l *myAccountLayout) { l.Tabs[0].Custom = true },
		"bad tab id":             func(l *myAccountLayout) { l.Tabs[2].ID = "Help Tab" },
		"reserved tab id":        func(l *myAccountLayout) { l.Tabs[2].ID = "assets" },
		"unknown icon":           func(l *myAccountLayout) { l.Tabs[2].Icon = "rocket" },
		"icon address not https": func(l *myAccountLayout) { l.Tabs[2].IconURL = "http://help.example.com/i.png" },
		"icon as data":           func(l *myAccountLayout) { l.Tabs[2].IconURL = "data:image/svg+xml;base64,PHN2Zy8+" },
		"too many tabs": func(l *myAccountLayout) {
			for range maxMyAccountTabs {
				l.Tabs = append(l.Tabs, MyAccountTab{ID: "x", Custom: true})
			}
		},
		"too many sections": func(l *myAccountLayout) {
			l.Tabs[2].Sections = make([]MyAccountSection, maxSectionsPerTab+1)
		},
		"duplicate section": func(l *myAccountLayout) {
			l.Tabs[2].Sections = append(l.Tabs[2].Sections, l.Tabs[0].Sections[0])
		},
		"bad section id":         func(l *myAccountLayout) { l.Tabs[0].Sections[0].ID = "-" },
		"home section elsewhere": func(l *myAccountLayout) { l.Tabs[1].Sections[0].Type = sectionHomeApps },
		"tab section on home":    func(l *myAccountLayout) { l.Tabs[0].Sections[0].Type = sectionProfile },
		"credential on home": func(l *myAccountLayout) {
			l.Tabs[0].Sections[0] = MyAccountSection{ID: "pin", Type: sectionCredential, Attribute: "pin"}
		},
		"unknown section type":     func(l *myAccountLayout) { l.Tabs[0].Sections[0].Type = "script" },
		"bad credential attribute": func(l *myAccountLayout) { l.Tabs[1].Sections[0].Attribute = "a b" },
		"credential with blocks": func(l *myAccountLayout) {
			l.Tabs[1].Sections[0].Blocks = []MyAccountWidgetBlock{{ID: "title", Type: blockHeading}}
		},
		"setting on a component": func(l *myAccountLayout) { l.Tabs[0].Sections[0].Attribute = "name" },
		"blocks on a component": func(l *myAccountLayout) {
			l.Tabs[0].Sections[0].Blocks = []MyAccountWidgetBlock{{ID: "title", Type: blockHeading}}
		},
		"widget with an attribute": func(l *myAccountLayout) { l.Tabs[2].Sections[0].Attribute = "name" },
		"widget with no blocks":    func(l *myAccountLayout) { l.Tabs[2].Sections[0].Blocks = nil },
		"too many blocks": func(l *myAccountLayout) {
			blocks := make([]MyAccountWidgetBlock, maxWidgetBlocks+1)
			for i := range blocks {
				blocks[i] = MyAccountWidgetBlock{ID: "b" + strings.Repeat("a", i), Type: blockText}
			}
			l.Tabs[2].Sections[0].Blocks = blocks
		},
		"duplicate block": func(l *myAccountLayout) { l.Tabs[2].Sections[0].Blocks[1].ID = "title" },
		"bad block id":    func(l *myAccountLayout) { l.Tabs[2].Sections[0].Blocks[0].ID = "Title" },
		"unknown block":   func(l *myAccountLayout) { l.Tabs[2].Sections[0].Blocks[0].Type = "html" },
		"text with a url": func(l *myAccountLayout) {
			l.Tabs[2].Sections[0].Blocks[1].URL = "https://example.com"
		},
		"image with no url": func(l *myAccountLayout) { l.Tabs[2].Sections[0].Blocks[2].URL = "" },
		"javascript button": func(l *myAccountLayout) {
			l.Tabs[2].Sections[0].Blocks[3].URL = "javascript:alert(1)"
		},
		"http image": func(l *myAccountLayout) {
			l.Tabs[2].Sections[0].Blocks[2].URL = "http://help.example.com/banner.png"
		},
		"button with no host": func(l *myAccountLayout) { l.Tabs[2].Sections[0].Blocks[3].URL = "https:///path" },
		"long button url": func(l *myAccountLayout) {
			l.Tabs[2].Sections[0].Blocks[3].URL = "https://example.com/" + strings.Repeat("a", maxWidgetURLLength)
		},
		"bad language": func(l *myAccountLayout) {
			l.Text = map[string]map[string]string{"English": {"tabs.help": "Help"}}
		},
		"bad text key": func(l *myAccountLayout) {
			l.Text = map[string]map[string]string{"en": {"tabs help": "Help"}}
		},
		"long text value": func(l *myAccountLayout) {
			l.Text = map[string]map[string]string{"en": {"tabs.help": strings.Repeat("a", maxTextValueLength+1)}}
		},
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			layout := validLayout()
			change(&layout)
			assert.False(t, isValidMyAccountLayout(layout))
		})
	}
}

func (suite *FlowMetaServiceTestSuite) expectMyAccountLookup(metadata map[string]interface{},
	translations map[string]map[string]string) {
	suite.expectInboundLookup(testMyAccountAppID, testOUID, "My Account", false, map[string]interface{}{
		applicationMetadataProperty: metadata,
	})
	suite.mockOUService.On("GetOrganizationUnit", mock.Anything, testOUID).
		Return(providers.OrganizationUnit{ID: testOUID}, nil)
	suite.mockDesignResolve.On("ResolveDesign", mock.Anything, providers.DesignResolveTypeAPP, testMyAccountAppID).
		Return(nil, nil)
	suite.mockI18nService.On("ResolveTranslations", mock.Anything, testMyAccountLanguage, mock.Anything).
		Return(&providers.LanguageTranslationsResponse{
			Language: testMyAccountLanguage, Translations: translations,
		}, nil)
	suite.mockI18nService.On("ListLanguages", mock.Anything).Return([]string{testMyAccountLanguage}, nil)
}

func (suite *FlowMetaServiceTestSuite) TestGetFlowMetadata_APP_ServesTheMyAccountLayout() {
	suite.expectMyAccountLookup(map[string]interface{}{myAccountMetadataKey: myAccountMetadataJSON()},
		map[string]map[string]string{myAccountNamespace: {"tabs.home": "Home", "tabs.help": "Support"}})
	language := testMyAccountLanguage

	result, svcErr := suite.service.GetFlowMetadata(suite.ctx, MetaTypeAPP, testMyAccountAppID, &language, nil)

	suite.Require().Nil(svcErr)
	suite.Require().NotNil(result.MyAccount)
	suite.Len(result.MyAccount.Tabs, 3)
	suite.Equal("help", result.MyAccount.Tabs[2].ID)
	suite.Equal(map[string]string{"tabs.home": "Home", "tabs.help": "Help"},
		result.I18n.Translations[myAccountNamespace])
}

func (suite *FlowMetaServiceTestSuite) TestGetFlowMetadata_APP_KeepsMyAccountTextOutOfOtherNamespaces() {
	suite.expectMyAccountLookup(map[string]interface{}{myAccountMetadataKey: myAccountMetadataJSON()},
		map[string]map[string]string{"signin": {"login.title": "Welcome"}})
	language := testMyAccountLanguage
	namespace := "signin"

	result, svcErr := suite.service.GetFlowMetadata(suite.ctx, MetaTypeAPP, testMyAccountAppID, &language, &namespace)

	suite.Require().Nil(svcErr)
	suite.NotNil(result.MyAccount)
	suite.NotContains(result.I18n.Translations, myAccountNamespace)
}

func (suite *FlowMetaServiceTestSuite) TestGetFlowMetadata_APP_IgnoresAnInvalidMyAccountLayout() {
	layout := myAccountMetadataJSON()
	layout["tabs"].([]interface{})[2].(map[string]interface{})["sections"] = []interface{}{
		map[string]interface{}{"id": "docs", "type": "widget", "blocks": []interface{}{
			map[string]interface{}{"id": "open", "type": "button", "url": "javascript:alert(1)"},
		}},
	}
	suite.expectMyAccountLookup(map[string]interface{}{myAccountMetadataKey: layout},
		map[string]map[string]string{})
	language := testMyAccountLanguage

	result, svcErr := suite.service.GetFlowMetadata(suite.ctx, MetaTypeAPP, testMyAccountAppID, &language, nil)

	suite.Require().Nil(svcErr)
	suite.Nil(result.MyAccount)
	suite.NotContains(result.I18n.Translations, myAccountNamespace)
}

func TestMergeMyAccountText_FallsBackToTheSystemAndBaseLanguages(t *testing.T) {
	text := map[string]map[string]string{
		"en-US": {"tabs.help": "Help", "help.subtitle": "Get help", "sections.docs.title": "Docs"},
		"en":    {"help.subtitle": "Find help"},
		"en-GB": {"sections.docs.title": "Documents"},
	}
	cases := map[string]map[string]string{
		"en-US": {"tabs.help": "Help", "help.subtitle": "Get help", "sections.docs.title": "Docs"},
		"en-GB": {"tabs.help": "Help", "help.subtitle": "Find help", "sections.docs.title": "Documents"},
		"en":    {"tabs.help": "Help", "help.subtitle": "Find help", "sections.docs.title": "Docs"},
		"fr-FR": {"tabs.help": "Help", "help.subtitle": "Get help", "sections.docs.title": "Docs"},
	}
	for language, want := range cases {
		t.Run(language, func(t *testing.T) {
			response := &FlowMetadataResponse{I18n: I18nMetadata{Language: language}}

			mergeMyAccountText(response, text, "")

			assert.Equal(t, want, response.I18n.Translations[myAccountNamespace])
		})
	}
}

func TestMergeMyAccountText_KeepsTheTranslationsWithoutText(t *testing.T) {
	response := &FlowMetadataResponse{I18n: I18nMetadata{Language: "en-GB"}}

	mergeMyAccountText(response, map[string]map[string]string{"fr": {"tabs.help": "Aide"}}, "")

	assert.NotContains(t, response.I18n.Translations, myAccountNamespace)
}
