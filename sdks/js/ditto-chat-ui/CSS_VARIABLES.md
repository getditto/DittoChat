# CSS Variables Reference

This document details the usage of each CSS variable in `DittoChatUI`, helping you understand which UI components and areas are affected when you override them.

## Primary Colors

Controls the main branding and interactive elements.

| Variable | Description | Affects / Used In |
| :--- | :--- | :--- |
| `--dc-primary-color` | Brand color | **Message Input**: Send button<br>**Chat List**: "New Message" button<br>**Bubbles**: Sent message background<br>**Modals**: Primary action buttons |
| `--dc-primary-color-hover` | Hower state | **Buttons**: Hover state for "New Message", "Create Room", and other primary actions |
| `--dc-primary-color-focus` | Focus ring | **Inputs**: Focus ring for Search bars, New Room name input, etc. |
| `--dc-primary-color-light` | Selected background | **Chat List**: Background of the currently selected active chat item |
| `--dc-primary-color-lighter` | Light accent | **Bubbles**: Background for image attachments in sent messages |
| `--dc-primary-color-light-border`| Accent border | **Bubbles**: Border for image attachments in sent messages |
| `--dc-primary-color-dark-text` | Accent text | **Bubbles**: Text color inside image attachment containers |
| `--dc-text-on-primary` | Content on primary | **Buttons & Bubbles**: Text/Icon color sitting on top of `--dc-primary-color` elements |

## Mention Colors

| Variable | Description | Affects / Used In |
| :--- | :--- | :--- |
| `--dc-mention-text` | Mention link color | **Messages**: Color of `@username` mentions in received messages |
| `--dc-mention-text-on-primary` | Mention on primary | **Messages**: Color of `@username` mentions in sent messages (on primary background) |

## Surface & Background Colors

Controls the structural layout backgrounds.

| Variable | Description | Affects / Used In |
| :--- | :--- | :--- |
| `--dc-surface-color` | Main background | **Containers**: Main app container, Chat List, Modals |
| `--dc-surface-color-light` | Alternating bg | **Empty State**: Background when no chat is selected<br>**Modals**: User list item hover state |
| `--dc-secondary-bg` | Secondary background | **Inputs**: Search bars, Message input field<br>**Bubbles**: Received message background<br>**Chat View**: Empty/Loading states |
| `--dc-secondary-bg-hover` | Interaction bg | **Buttons**: Icon button hovers (e.g. Back, Options)<br>**Reactions**: Hover state for reaction pills<br>**Placeholders**: Avatar/Loading skeletons |
| `--dc-disabled-bg` | Disabled state | **Buttons**: Background for disabled buttons |

## Text Colors

| Variable | Description | Affects / Used In |
| :--- | :--- | :--- |
| `--dc-text-color` | Primary text | **Global**: Main body text, headings, icons |
| `--dc-text-color-medium` | Secondary text | **Bubbles**: Text content of received messages<br>**Menus**: Menu item text |
| `--dc-text-color-light` | Tertiary text | **Bubbles**: Reply context text<br>**Modals**: Section headers |
| `--dc-text-color-lighter` | Quaternary text | **Chat List**: Last message preview<br>**Headers**: Secondary header icons/text |
| `--dc-text-color-lightest` | Subtitle text | **Timestamps**: Message and Chat List timestamps |
| `--dc-text-color-faint` | Meta text | **Status**: "Edited" label, Search icons |
| `--dc-text-color-disabled` | Disabled text | **Buttons**: Text in disabled buttons |

## Border Colors

| Variable | Description | Affects / Used In |
| :--- | :--- | :--- |
| `--dc-border-color` | Borders | **Dividers**: Header/List separators<br>**Inputs**: Border for search and text inputs |

## Status & Semantic Colors

Indicators for state and feedback.

| Variable | Description | Affects / Used In |
| :--- | :--- | :--- |
| `--dc-edit-bg` | Edit indication | **Message Input**: Background of "Editing message..." indicator |
| `--dc-edit-text` | Edit text | **Message Input**: Text color of "Editing message..." indicator |
| `--dc-notification-badge-bg` | Notification | **Chat List**: Unread message count badge background |
| `--dc-active-status-bg` | Online status | **Chat List/View**: Green online status dot for users |
| `--dc-danger-text` | Destructive action | **Menus**: "Delete Message" text color |
| `--dc-danger-bg` | Destructive bg | *(Currently unused in default UI)* |
| `--dc-success-bg` | Success state | *(Currently unused in default UI)* |
| `--dc-success-text` | Success text | *(Currently unused in default UI)* |
| `--dc-info-icon-color` | Info accent | *(Currently unused in default UI)* |
