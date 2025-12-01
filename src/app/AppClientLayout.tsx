"use client"

import { Analytics } from "@vercel/analytics/next"
import { InboxProvider } from "@/context/inbox-context"
import { UserMenuProvider } from "@/context/user-menu-context"
import { UserProvider } from "@/context/userContext"
import { Suspense } from "react"
import type React from "react"
import { NotificationsWrapper } from "@/components/NotificationsWrapper"

export const AppClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <Suspense>
        <UserProvider>
          <InboxProvider>
            <UserMenuProvider>
              <NotificationsWrapper>
                  {children}
              </NotificationsWrapper>
            </UserMenuProvider>
          </InboxProvider>
        </UserProvider>
      </Suspense>
      <Analytics />
    </>
  )
}