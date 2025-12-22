import * as PopoverPrimitive from '@radix-ui/react-popover'
import { clsx } from 'clsx'
import React from 'react'

import { useThemeClass } from '../../hooks/useThemeClass'

// Re-export all primitives except Content
export const Root = PopoverPrimitive.Root
export const Trigger = PopoverPrimitive.Trigger
export const Anchor = PopoverPrimitive.Anchor
export const Portal = PopoverPrimitive.Portal
export const Close = PopoverPrimitive.Close
export const Arrow = PopoverPrimitive.Arrow

// Wrap Content to add dcui-root class and theme class for CSS variable inheritance
export const Content = React.forwardRef<
    React.ComponentRef<typeof PopoverPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, ...props }, ref) => {
    const themeClass = useThemeClass()

    return (
        <PopoverPrimitive.Content
            ref={ref}
            className={clsx('dcui-root', themeClass, className)}
            {...props}
        />
    )
})

Content.displayName = 'PopoverContent'
