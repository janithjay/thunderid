// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {resolveLogoUri} from '@thunderid/react';
import {useState, type ReactElement, type ReactNode} from 'react';
import initials from '../utils/initials';

interface AppLogoProps {
  className?: string;
  name: string;
  url?: string;
}

/**
 * An application's logo, or its initials when it has none or the image fails to load. A logo is
 * not always an image URL: the server also stores `avatar:` URIs, which resolve to a generated
 * image, and `emoji:` URIs, which resolve to a glyph. `resolveLogoUri` handles all three, as the
 * SDK's own components do.
 */
export default function AppLogo({className = 'home-app-logo', name, url = undefined}: AppLogoProps): ReactElement {
  // Remembers the image that failed, so a new logo gets its own attempt.
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined);
  const logo: ReturnType<typeof resolveLogoUri> | undefined = url ? resolveLogoUri(url, name) : undefined;

  let content: ReactNode = initials(name);

  if (logo?.kind === 'emoji' && logo.glyph) {
    content = <span className="app-logo-glyph">{logo.glyph}</span>;
  } else if (logo?.imgSrc && logo.imgSrc !== failedSrc) {
    const src: string = logo.imgSrc;

    content = <img src={src} alt="" onError={() => setFailedSrc(src)} />;
  }

  return (
    <span className={className} aria-hidden="true">
      {content}
    </span>
  );
}
