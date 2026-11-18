// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {CspOriginHint} from '@thunderid/components';
import {Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip} from '@wso2/oxygen-ui';
import {useState, type JSX} from 'react';
import {useTranslation} from 'react-i18next';
import {PanelField} from './PanelSection';
import TabIcon from './TabIcon';
import {TAB_ICONS} from '../constants/catalog';
import type {MyAccountTab, MyAccountTabIcon} from '../models/my-account';
import {HTTPS_URL_PATTERN, type TabIconChoice} from '../utils/layoutEditing';

// The value of the option that keeps a built-in tab's own icon.
const OWN_ICON = 'own';

interface TabIconPickerProps {
  /** For a built-in tab: the tab, whose own icon is offered first. */
  builtInTab?: MyAccountTab;
  /** The prefix of the IDs of the picker's fields, so two pickers on a page do not share them. */
  idPrefix: string;
  onChange: (choice: TabIconChoice) => void;
  readOnly?: boolean;
  value: TabIconChoice;
}

/**
 * Picks a tab's icon: one of My Account's icons, or any image by its https address, as the Console's other image
 * fields take one. Clearing the address goes back to the tab's default icon.
 */
export default function TabIconPicker({
  builtInTab = undefined,
  idPrefix,
  onChange,
  readOnly = false,
  value,
}: TabIconPickerProps): JSX.Element {
  const {t} = useTranslation('myAccountConfig');
  // The address being typed, kept until it is one an icon can use.
  const [address, setAddress] = useState<string>(value.iconUrl ?? '');
  let named: string | null = value.icon ?? null;
  if (!value.iconUrl && !value.icon && builtInTab) named = OWN_ICON;
  const addressInvalid: boolean = address !== '' && !HTTPS_URL_PATTERN.test(address);

  return (
    <Stack spacing={2}>
      <PanelField id={`${idPrefix}-icons`} label={t('icon.library', 'Icon')}>
        <ToggleButtonGroup
          id={`${idPrefix}-icons`}
          aria-labelledby={`${idPrefix}-icons-label`}
          exclusive
          size="small"
          disabled={readOnly}
          value={value.iconUrl ? null : named}
          onChange={(_event, next: string | null) => {
            if (next === null) return;
            setAddress('');
            onChange(next === OWN_ICON ? {} : {icon: next as MyAccountTabIcon});
          }}
          sx={{flexWrap: 'wrap', gap: 0.5}}
        >
          {builtInTab && (
            <Tooltip title={t('icon.own', 'Its own icon')}>
              <ToggleButton value={OWN_ICON} aria-label={t('icon.own', 'Its own icon')}>
                <TabIcon tab={{id: builtInTab.id, sections: []}} />
              </ToggleButton>
            </Tooltip>
          )}
          {TAB_ICONS.map((option: MyAccountTabIcon) => (
            <Tooltip key={option} title={t(`icons.${option}`, option)}>
              <ToggleButton value={option} aria-label={t(`icons.${option}`, option)}>
                <TabIcon tab={{id: option, custom: true, icon: option, sections: []}} />
              </ToggleButton>
            </Tooltip>
          ))}
        </ToggleButtonGroup>
      </PanelField>

      <PanelField
        id={`${idPrefix}-address`}
        label={t('icon.address', 'Or an image address')}
        error={addressInvalid}
        helperText={
          addressInvalid
            ? t('icon.errors.address', 'It must start with https://.')
            : t('icon.addressHint', 'Any image, such as an SVG or PNG. It shows at 20 pixels.')
        }
      >
        <TextField
          id={`${idPrefix}-address`}
          size="small"
          placeholder="https://"
          value={address}
          error={addressInvalid}
          onChange={(event) => {
            const next: string = event.target.value.trim();
            setAddress(next);
            if (HTTPS_URL_PATTERN.test(next)) {
              onChange({iconUrl: next});
            } else if (next === '' && value.iconUrl) {
              onChange({});
            }
          }}
          slotProps={{input: {readOnly}, htmlInput: {maxLength: 2048}}}
          fullWidth
        />
        {address !== '' && !addressInvalid && <CspOriginHint value={address} resourceType="image" />}
      </PanelField>
    </Stack>
  );
}
