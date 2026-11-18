// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Box, FormControl, FormHelperText, FormLabel, Stack, Typography} from '@wso2/oxygen-ui';
import type {JSX, ReactNode} from 'react';

interface PanelSectionProps {
  children: ReactNode;
  title: string;
}

/**
 * A group of related properties under a quiet heading, as the flow builder's properties panel groups them.
 */
export function PanelSection({children, title}: PanelSectionProps): JSX.Element {
  return (
    <Box component="section">
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{display: 'block', letterSpacing: '0.08em', lineHeight: 1.6, mb: 0.5}}
      >
        {title}
      </Typography>
      <Stack gap={2}>{children}</Stack>
    </Box>
  );
}

interface PanelFieldProps {
  /** The field, whose input has the ID `id`. */
  children: ReactNode;
  error?: boolean;
  helperText?: ReactNode;
  id: string;
  label: string;
  required?: boolean;
}

/**
 * A field with its label above it, as the flow builder's properties panel labels its fields, rather than inside
 * the box. A select names itself with `slotProps={{select: {labelId: '<id>-label'}}}`.
 */
export function PanelField({
  children,
  error = false,
  helperText = undefined,
  id,
  label,
  required = false,
}: PanelFieldProps): JSX.Element {
  return (
    <FormControl fullWidth error={error} required={required}>
      {/* A select names its box through the label's ID, `<id>-label`, as it is not an input the label is for. */}
      <FormLabel htmlFor={id} id={`${id}-label`}>
        {label}
      </FormLabel>
      {children}
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
