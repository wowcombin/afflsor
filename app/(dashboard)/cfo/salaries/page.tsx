'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ExportExcel } from '@/components/ExportExcel'

interface SalaryCalculation {
  id: string
  user_id: string
  users: {
    first_name: string
    last_name: string
  }
  gross_profit: number
  base_salary: number
  bonus: number
  total_salary: number
  paid: boolean
}

export default function CFOSalariesPage() {
  const [calculations, setCalculations] = useState<SalaryCalculation[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [month, setMonth] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchCalculations()
  }, [])

  const fetchCalculations = async () => {
    // Получить текущий месяц для расчета
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString().split('T')[0]
    
    setMonth(currentMonth)

    const { data, error } = await supabase
      .from('salary_calculations')
      .select(`
        *,
        users (first_name, last_name)
      `)
      .eq('month', currentMonth)
      .eq('paid', false)
      .order('total_salary', { ascending: false })

    if (!error && data) {
      setCalculations(data)
    }
    setLoading(false)
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const selectAll = () => {
    if (selected.size === calculations.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(calculations.map(c => c.id)))
    }
  }

  const recalculateSelected = async () => {
    if (selected.size === 0) {
      alert('Выберите хотя бы одну зарплату для пересчета')
      return
    }

    if (!confirm(`Пересчитать ${selected.size} зарплат?`)) {
      return
    }

    setProcessing(true)

    try {
      const response = await fetch('/api/finance/salaries/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        await fetchCalculations()
        setSelected(new Set())
      } else {
        const data = await response.json()
        alert(`Ошибка: ${data.error}`)
      }
    } catch (error) {
      alert('Ошибка сети')
    } finally {
      setProcessing(false)
    }
  }

  const confirmPayment = async () => {
    if (selected.size === 0) {
      alert('Выберите хотя бы одну зарплату')
      return
    }

    if (!confirm(`Подтвердить выплату ${selected.size} зарплат на сумму $${totalSelected.toFixed(2)}?`)) {
      return
    }

    setProcessing(true)

    try {
      // Обновить статус на paid
      for (const id of Array.from(selected)) {
        const calculation = calculations.find(c => c.id === id)
        if (calculation) {
          await supabase
            .from('salary_calculations')
            .update({ 
              paid: true, 
              paid_at: new Date().toISOString(),
              paid_amount: calculation.total_salary 
            })
            .eq('id', id)
        }
      }

      await fetchCalculations()
      setSelected(new Set())
    } catch (error) {
      alert('Ошибка при подтверждении выплат')
    } finally {
      setProcessing(false)
    }
  }



  if (loading) return <div className="p-8">Загрузка...</div>

  const totalSelected = calculations
    .filter(c => selected.has(c.id))
    .reduce((sum, c) => sum + c.total_salary, 0)

  const totalAll = calculations.reduce((sum, c) => sum + c.total_salary, 0)

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Расчет зарплат за {new Date(month).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={recalculateSelected}
            disabled={processing}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            {processing ? 'Пересчет...' : 'Пересчитать'}
          </button>
          <ExportExcel
            data={calculations.map(c => ({
              name: `${c.users.first_name} ${c.users.last_name}`,
              profit: c.gross_profit,
              base: c.base_salary,
              bonus: c.bonus,
              total: c.total_salary
            }))}
            filename="зарплаты"
            columns={[
              { key: 'name', label: 'Сотрудник' },
              { key: 'profit', label: 'Профит', format: 'currency' },
              { key: 'base', label: 'База', format: 'currency' },
              { key: 'bonus', label: 'Бонус', format: 'currency' },
              { key: 'total', label: 'Итого', format: 'currency' }
            ]}
            includeTotal={true}
          />
        </div>
      </div>

      {calculations.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="text-gray-500">
            Нет расчетов зарплат за этот месяц.
          </div>
          <button
            onClick={recalculateSelected}
            disabled={processing}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {processing ? 'Расчет...' : 'Рассчитать зарплаты'}
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === calculations.length && calculations.length > 0}
                      onChange={selectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left">Сотрудник</th>
                  <th className="px-6 py-3 text-right">Профит за месяц</th>
                  <th className="px-6 py-3 text-right">База (%)</th>
                  <th className="px-6 py-3 text-right">Бонус</th>
                  <th className="px-6 py-3 text-right">К выплате</th>
                  <th className="px-6 py-3 text-center">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {calculations.map(calc => (
                  <tr key={calc.id} className={selected.has(calc.id) ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(calc.id)}
                        onChange={() => toggleSelect(calc.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {calc.users.first_name} {calc.users.last_name}
                    </td>
                    <td className="px-6 py-4 text-right">${calc.gross_profit.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">${calc.base_salary.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">${calc.bonus.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600">
                      ${calc.total_salary.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                        Ожидает выплаты
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4">ИТОГО</td>
                  <td className="px-6 py-4 text-right">
                    ${calculations.reduce((sum, c) => sum + c.gross_profit, 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    ${calculations.reduce((sum, c) => sum + c.base_salary, 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    ${calculations.reduce((sum, c) => sum + c.bonus, 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-green-600">
                    ${totalAll.toFixed(2)}
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-between items-center bg-white p-4 rounded-lg shadow">
            <div className="text-lg">
              <span className="text-gray-600">Выбрано:</span> {selected.size} из {calculations.length} | 
              <span className="font-semibold text-green-600 ml-2">
                Сумма: ${totalSelected.toFixed(2)}
              </span>
            </div>
            <button
              onClick={confirmPayment}
              disabled={selected.size === 0 || processing}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {processing ? 'Обработка...' : 'Подтвердить выплаты'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
