import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { clsx } from 'clsx'
import React from 'react'

import { getThemeClass } from '../../utils'

// Re-export all primitives except Content
export const Root = DropdownMenuPrimitive.Root
export const Trigger = DropdownMenuPrimitive.Trigger
export const Portal = DropdownMenuPrimitive.Portal
export const Sub = DropdownMenuPrimitive.Sub
export const SubTrigger = DropdownMenuPrimitive.SubTrigger
export const SubContent = DropdownMenuPrimitive.SubContent
export const Group = DropdownMenuPrimitive.Group
export const Label = DropdownMenuPrimitive.Label
export const Item = DropdownMenuPrimitive.Item
export const CheckboxItem = DropdownMenuPrimitive.CheckboxItem
export const RadioGroup = DropdownMenuPrimitive.RadioGroup
export const RadioItem = DropdownMenuPrimitive.RadioItem
export const ItemIndicator = DropdownMenuPrimitive.ItemIndicator
export const Separator = DropdownMenuPrimitive.Separator
export const Arrow = DropdownMenuPrimitive.Arrow

// Wrap Content to add dcui-root class and theme class for CSS variable inheritance
export const Content = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, ...props }, ref) => {
  const themeClass = getThemeClass()

  return (
    <DropdownMenuPrimitive.Content
      ref={ref}
      className={clsx('dcui-root', themeClass, className)}
      {...props}
    />
  )
})

Content.displayName = 'DropdownMenuContent'
