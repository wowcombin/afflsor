import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('=== NDA DEBUG SIGN API START ===')
    
    // Создаем клиент с service role для полного доступа
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Получаем данные из формы
    const formData = await request.formData()
    
    const agreementId = formData.get('agreementId') as string
    const fullName = formData.get('fullName') as string
    const dateOfBirth = formData.get('dateOfBirth') as string
    const email = formData.get('email') as string
    const documentNumber = formData.get('documentNumber') as string
    const issuanceAddress = formData.get('issuanceAddress') as string
    const issuanceDate = formData.get('issuanceDate') as string
    const residentialAddress = formData.get('residentialAddress') as string
    const signature = formData.get('signature') as string
    const passportPhoto = formData.get('passportPhoto') as File
    const selfieWithPassport = formData.get('selfieWithPassport') as File

    console.log('Step 1: Form data received:', {
      agreementId: !!agreementId,
      fullName: !!fullName,
      dateOfBirth: !!dateOfBirth,
      email: !!email,
      documentNumber: !!documentNumber,
      issuanceAddress: !!issuanceAddress,
      issuanceDate: !!issuanceDate,
      residentialAddress: !!residentialAddress,
      hasSignature: !!signature,
      signatureLength: signature?.length,
      signaturePreview: signature?.substring(0, 50),
      hasPassportPhoto: !!passportPhoto,
      passportPhotoSize: passportPhoto?.size,
      hasSelfie: !!selfieWithPassport,
      selfieSize: selfieWithPassport?.size
    })

    // Проверяем обязательные поля
    if (!agreementId || !fullName || !dateOfBirth || !email || !documentNumber || 
        !issuanceAddress || !issuanceDate || !residentialAddress) {
      console.log('Step 2: Missing required fields')
      return NextResponse.json({ 
        error: 'Все поля обязательны для заполнения',
        debug: 'Missing required fields'
      }, { status: 400 })
    }

    // Проверяем подпись и файлы
    if (!signature) {
      console.log('Step 3: Missing signature')
      return NextResponse.json({ 
        error: 'Электронная подпись обязательна',
        debug: 'Missing signature'
      }, { status: 400 })
    }

    if (!passportPhoto || !selfieWithPassport) {
      console.log('Step 4: Missing files')
      return NextResponse.json({ 
        error: 'Фото документа и селфи обязательны для загрузки',
        debug: 'Missing files'
      }, { status: 400 })
    }

    console.log('Step 5: All validations passed')

    // Проверяем существование соглашения
    console.log('Step 6: Checking agreement existence')
    const { data: agreement, error: agreementError } = await supabase
      .from('nda_agreements')
      .select('id, user_id, template_id, status')
      .eq('id', agreementId)
      .single()

    if (agreementError || !agreement) {
      console.error('Step 7: Agreement not found:', agreementError)
      return NextResponse.json({ 
        error: 'Соглашение не найдено',
        debug: 'Agreement not found',
        details: agreementError?.message
      }, { status: 404 })
    }

    console.log('Step 8: Agreement found:', agreement)

    if (agreement.status !== 'pending') {
      console.log('Step 9: Agreement already signed')
      return NextResponse.json({ 
        error: 'Соглашение уже подписано или отменено',
        debug: 'Agreement not pending'
      }, { status: 400 })
    }

    console.log('Step 10: Testing signature processing')
    
    // Тестируем обработку подписи
    let signatureData = signature
    if (signature.includes(',')) {
      signatureData = signature.split(',')[1]
      console.log('Step 11: Signature has prefix, extracted data length:', signatureData.length)
    } else {
      console.log('Step 11: Signature has no prefix, using as is')
    }

    try {
      const signatureBuffer = Buffer.from(signatureData, 'base64')
      console.log('Step 12: Signature buffer created, size:', signatureBuffer.length)
    } catch (bufferError) {
      console.error('Step 12: Buffer creation failed:', bufferError)
      return NextResponse.json({ 
        error: 'Ошибка обработки подписи',
        debug: 'Buffer creation failed',
        details: bufferError instanceof Error ? bufferError.message : 'Unknown buffer error'
      }, { status: 500 })
    }

    console.log('Step 13: All checks passed - would proceed with file upload')

    return NextResponse.json({
      success: true,
      message: 'Диагностика прошла успешно',
      debug: 'All validations and processing checks passed',
      agreementId: agreementId,
      signatureLength: signatureData.length
    })

  } catch (error) {
    console.error('=== NDA DEBUG SIGN API ERROR ===')
    console.error('Error details:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      debug: 'Catch block reached',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
