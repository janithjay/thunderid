// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Button} from '@thunderid/react';
import type {ReactElement} from 'react';
import {useTranslation} from 'react-i18next';
import MoonIcon from './icons/MoonIcon';
import SunIcon from './icons/SunIcon';

interface ThemeToggleProps {
  dark: boolean;
  onToggle: () => void;
}

export default function ThemeToggle({dark, onToggle}: ThemeToggleProps): ReactElement {
  const {t} = useTranslation();

  return (
    <Button
      variant="icon"
      color="tertiary"
      onClick={onToggle}
      aria-label={dark ? t('theme.toLight', 'Switch to light mode') : t('theme.toDark', 'Switch to dark mode')}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
