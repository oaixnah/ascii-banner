# Third-party notices

ASCII Banner uses [figlet.js](https://github.com/patorjk/figlet.js), distributed under the MIT License, as its FIGfont rendering engine and font source package.

Each distributed `.flf` file remains unmodified and retains its original embedded comment header, authorship, and permission information. The build-generated font detail pages surface the first available attribution line.

The font sync step treats figlet.js's MIT license as the package-level redistribution basis, then rejects any font whose embedded header contains a conflicting notice. This includes statements that a font was ported or changed without permission, was derived from a copyrighted program, or names a separate copyright holder without redistribution terms. A font is also excluded when it cannot produce printable English ASCII output. New conflict patterns must be added to the audited sync rule before release.
