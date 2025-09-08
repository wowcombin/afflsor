import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== SIMPLE DEBUG API START ===')
    
    // Проверяем, можем ли мы вообще получить данные из формы
    let formData
    try {
      formData = await request.formData()
      console.log('FormData успешно получена')
    } catch (formError) {
      console.error('Ошибка получения FormData:', formError)
      return NextResponse.json({ 
        error: 'Ошибка получения данных формы',
        details: formError instanceof Error ? formError.message : 'Unknown form error'
      }, { status: 400 })
    }

    // Проверяем базовые поля
    const agreementId = formData.get('agreementId') as string
    const fullName = formData.get('fullName') as string
    const signature = formData.get('signature') as string

    console.log('Базовые поля:', {
      agreementId: !!agreementId,
      fullName: !!fullName,
      hasSignature: !!signature,
      signatureLength: signature?.length || 0
    })

    // Проверяем файлы
    const passportPhoto = formData.get('passportPhoto') as File
    const selfieWithPassport = formData.get('selfieWithPassport') as File

    console.log('Файлы:', {
      hasPassportPhoto: !!passportPhoto,
      passportPhotoSize: passportPhoto?.size || 0,
      hasSelfie: !!selfieWithPassport,
      selfieSize: selfieWithPassport?.size || 0
    })

    return NextResponse.json({
      success: true,
      message: 'Простая диагностика прошла успешно',
      data: {
        agreementId: !!agreementId,
        fullName: !!fullName,
        hasSignature: !!signature,
        signatureLength: signature?.length || 0,
        hasPassportPhoto: !!passportPhoto,
        passportPhotoSize: passportPhoto?.size || 0,
        hasSelfie: !!selfieWithPassport,
        selfieSize: selfieWithPassport?.size || 0
      }
    })

  } catch (error) {
    console.error('=== SIMPLE DEBUG API ERROR ===')
    console.error('Error:', error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return NextResponse.json({ 
      error: 'Критическая ошибка API',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
