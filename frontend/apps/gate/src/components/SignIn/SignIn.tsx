// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useDesign, AuthPageLayout, AuthSidePanel, resolveSidePanel} from '@thunderid/design';
import {useThunderID} from '@thunderid/react';
import {ParticleBackground} from '@wso2/oxygen-ui';
import type {JSX} from 'react';
import SignInBox from './SignInBox';
import SignInSlogan from './SignInSlogan';

export default function SignIn(): JSX.Element {
  const {isMetaLoading} = useThunderID();
  const {isDesignEnabled, isLoading: isDesignLoading, layout} = useDesign();

  const showSlogan = !isDesignLoading && !isDesignEnabled;
  // The panel the application's layout sets beside the form, on its left or its right.
  const sidePanel = isDesignEnabled ? resolveSidePanel(layout?.sidePanel) : null;
  const panel = sidePanel ? <AuthSidePanel panel={layout?.sidePanel} /> : null;

  return (
    <AuthPageLayout
      isLoading={isMetaLoading || isDesignLoading}
      variant="SignIn"
      centerColumns={Boolean(sidePanel) || showSlogan}
    >
      {showSlogan && <ParticleBackground opacity={0.5} />}
      {showSlogan && <SignInSlogan />}
      {sidePanel?.position === 'left' && panel}
      <SignInBox />
      {sidePanel?.position === 'right' && panel}
    </AuthPageLayout>
  );
}
