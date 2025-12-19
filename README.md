# DittoChat

<div>

<svg width="167" height="64" viewBox="0 0 167 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="167" height="64" rx="4" fill="#EEEFF1"/>
<g clip-path="url(#clip0_2_20)">
<path d="M139.128 47.2381C131.943 47.2381 127.255 42.6754 127.255 35.8096C127.255 28.9437 131.943 24.381 139.128 24.381C146.312 24.381 151 28.9437 151 35.8096C151 42.7189 146.312 47.2381 139.128 47.2381ZM139.128 41.9048C142.383 41.9048 144.872 39.5901 144.872 35.8096C144.872 32.029 142.239 29.7143 139.128 29.7143C136.016 29.7143 133.383 32.029 133.383 35.8096C133.383 39.5901 135.872 41.9048 139.128 41.9048Z" fill="#0E1012"/>
<path d="M98.5319 39.2726V17.5238H104.66V25.1429H110.021V30.4762H104.66L104.652 38.5277C104.652 40.1048 104.694 41.1429 106.28 41.1429H110.787V46.4762H106.065C101.749 46.4762 98.5319 43.5661 98.5319 39.2726Z" fill="#0E1012"/>
<path d="M113.372 39.2726V17.5238H119.5V25.1429H124.862V30.4762H119.5L119.492 38.5277C119.492 40.1048 119.534 41.1429 121.12 41.1429H125.628V46.4762H120.906C116.589 46.4762 113.372 43.5661 113.372 39.2726Z" fill="#0E1012"/>
<path d="M78.2456 17.5238H84.3617V46.4762H79V44.0477C77.5026 45.9752 75.3656 47.2381 72.1063 47.2381C66.0286 47.2819 60.617 42.9504 60.617 35.8096C60.617 28.8438 65.5958 24.381 72.1063 24.381C74.4042 24.381 76.9414 25.0952 78.234 26.7143L78.2456 17.5238ZM72.5851 41.9048C75.9763 41.9048 78.234 39.621 78.234 35.8096C78.234 31.9543 75.7926 29.7143 72.8244 29.7143C69.4331 29.7143 66.7447 31.9543 66.7447 35.8096C66.7447 39.6648 69.1938 41.9048 72.5851 41.9048Z" fill="#0E1012"/>
<path d="M94.5107 25.9048H88.383V46.4762H94.5107V25.9048Z" fill="#0E1012"/>
<path d="M91.4685 16.7619C93.468 16.7619 94.9893 18.1851 94.9893 20.1689C94.9893 22.1527 93.468 23.619 91.4685 23.619C89.4255 23.619 87.9042 22.1527 87.9042 20.1689C87.9042 18.1851 89.4255 16.7619 91.4685 16.7619Z" fill="#0E1012"/>
<path d="M43.9415 16.189L52.7491 31.2302C53.0275 31.7057 53.0268 32.2939 52.7473 32.7688L43.8939 47.8117C43.8253 47.9283 43.6998 48 43.564 48H32.8265C32.5328 48 32.3488 47.684 32.4944 47.4301L40.9115 32.756C41.1802 32.2875 41.1802 31.7124 40.9115 31.244L32.4944 16.57C32.3487 16.316 32.5328 16 32.8265 16H43.6112C43.7472 16 43.873 16.072 43.9415 16.189Z" fill="#0066FF"/>
<path d="M27.4981 16.189L36.3056 31.2302C36.5841 31.7057 36.5835 32.2939 36.3038 32.7688L27.4504 47.8117C27.3818 47.9283 27.2562 48 27.1205 48H16.383C16.0894 48 15.9053 47.684 16.051 47.4301L24.4681 32.756C24.7368 32.2875 24.7368 31.7124 24.4681 31.244L16.0509 16.57C15.9053 16.316 16.0894 16 16.383 16H27.1678C27.3038 16 27.4296 16.072 27.4981 16.189Z" fill="#0066FF"/>
</g>
<defs>
<clipPath id="clip0_2_20">
<rect width="135" height="32" fill="white" transform="translate(16 16)"/>
</clipPath>
</defs>
</svg>

</div>

A suite of SDKs that provides UI components and data models to quickly build a
peer-to-peer chat application using the Ditto Platform.

## Features

- Real-time, peer-to-peer chat

- Group chat and private messaging

- User presence and typing indicators

- Easy-to-integrate SwiftUI views

- Built on the Ditto Sync Platform

## Requirements:

### iOS

- iOS 18.0+
- Xcode 15.6+
- Swift 5.7+
- A Ditto Account, AppId, and baseline knowledge of the [DittoSwift SDK](https://github.com/getditto/DittoSwiftPackage)

### Android

- TBD

### Web

- Node.js 18.0+
- React 18.0+ or 19.0+
- TypeScript 4.5+
- A Ditto Account, AppId, and baseline knowledge of the [Ditto JavaScript SDK](https://docs.ditto.live/sdk/latest/install-guides/js)

#### Packages

The JavaScript implementation consists of two packages:

**[@dittolive/ditto-chat-core](./sdks/js/ditto-chat-core/README.md)** - Core data models and React hooks for real-time chat functionalities

```bash
npm install @dittolive/ditto-chat-core
# or
yarn add @dittolive/ditto-chat-core
```

**[@dittolive/ditto-chat-ui](./sdks/js/ditto-chat-ui/README.md)** - Ready-to-use React components for building chat UIs

```bash
npm install @dittolive/ditto-chat-ui
# or
yarn add @dittolive/ditto-chat-ui
```

## Publishing

This monorepo uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

### For Contributors

When making changes to the packages, please create a changeset to document your changes:

```bash
npm run changeset
```

This will prompt you to select which packages are affected and describe your changes.

### Release Process

Releases are automated via GitHub Actions:
1. When changesets are merged to `main`, a "Version Packages" PR is automatically created
2. Merging the "Version Packages" PR publishes the packages to NPM