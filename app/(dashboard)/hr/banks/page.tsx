'use client'

import { useState, useEffect } from 'react'
import ManagerBanksPage from '../../manager/banks/page'

// HR имеет те же права что и Manager для управления балансами
export default function HRBanksPage() {
  return <ManagerBanksPage />
}