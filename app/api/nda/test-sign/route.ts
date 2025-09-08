import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('=== NDA SIGN TEST API START ===')
    
    // Создаем клиент с service role для полного доступа
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('Step 1: Supabase client created')
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Has service key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    // Получаем данные из формы
    let formData
    try {
      formData = await request.formData()
      console.log('Step 2: FormData received successfully')
    } catch (formError) {
      console.error('Step 2 ERROR: Failed to get FormData:', formError)
      return NextResponse.json({ 
        error: 'Ошибка получения данных формы',
        step: 2,
        details: formError instanceof Error ? formError.message : 'Unknown form error'
      }, { status: 400 })
    }
    
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

    console.log('Step 3: Form data extracted:', {
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
      hasPassportPhoto: !!passportPhoto,
      passportPhotoSize: passportPhoto?.size,
      hasSelfie: !!selfieWithPassport,
      selfieSize: selfieWithPassport?.size
    })

    // Проверяем обязательные поля
    if (!agreementId || !fullName || !dateOfBirth || !email || !documentNumber || 
        !issuanceAddress || !issuanceDate || !residentialAddress) {
      console.log('Step 4 ERROR: Missing required fields')
      return NextResponse.json({ 
        error: 'Все поля обязательны для заполнения',
        step: 4,
        missing: {
          agreementId: !agreementId,
          fullName: !fullName,
          dateOfBirth: !dateOfBirth,
          email: !email,
          documentNumber: !documentNumber,
          issuanceAddress: !issuanceAddress,
          issuanceDate: !issuanceDate,
          residentialAddress: !residentialAddress
        }
      }, { status: 400 })
    }

    console.log('Step 4: All required fields present')

    // Проверяем подпись и файлы
    if (!signature) {
      console.log('Step 5 ERROR: Missing signature')
      return NextResponse.json({ 
        error: 'Электронная подпись обязательна',
        step: 5
      }, { status: 400 })
    }

    if (!passportPhoto || !selfieWithPassport) {
      console.log('Step 6 ERROR: Missing files')
      return NextResponse.json({ 
        error: 'Фото документа и селфи обязательны для загрузки',
        step: 6,
        hasPassportPhoto: !!passportPhoto,
        hasSelfie: !!selfieWithPassport
      }, { status: 400 })
    }

    console.log('Step 5-6: Signature and files present')

    // Проверяем существование соглашения
    console.log('Step 7: Checking agreement existence')
    const { data: agreement, error: agreementError } = await supabase
      .from('nda_agreements')
      .select('id, user_id, template_id, status')
      .eq('id', agreementId)
      .single()

    if (agreementError || !agreement) {
      console.error('Step 7 ERROR: Agreement not found:', agreementError)
      return NextResponse.json({ 
        error: 'Соглашение не найдено',
        step: 7,
        agreementId,
        details: agreementError?.message
      }, { status: 404 })
    }

    console.log('Step 7: Agreement found:', agreement)

    if (agreement.status !== 'pending') {
      console.log('Step 8 ERROR: Agreement not pending, status:', agreement.status)
      return NextResponse.json({ 
        error: 'Соглашение уже подписано или отменено',
        step: 8,
        currentStatus: agreement.status
      }, { status: 400 })
    }

    console.log('Step 8: Agreement status is pending')

    // Тестируем обработку подписи
    console.log('Step 9: Testing signature processing')
    let signatureData = signature
    if (signature.includes(',')) {
      signatureData = signature.split(',')[1]
      console.log('Step 9a: Signature has prefix, extracted data length:', signatureData.length)
    } else {
      console.log('Step 9a: Signature has no prefix, using as is')
    }

    let signatureBuffer
    try {
      signatureBuffer = Buffer.from(signatureData, 'base64')
      console.log('Step 9b: Signature buffer created, size:', signatureBuffer.length)
    } catch (bufferError) {
      console.error('Step 9b ERROR: Buffer creation failed:', bufferError)
      return NextResponse.json({ 
        error: 'Ошибка обработки подписи',
        step: 9,
        details: bufferError instanceof Error ? bufferError.message : 'Unknown buffer error'
      }, { status: 500 })
    }

    // Тестируем загрузку файлов в Storage
    console.log('Step 10: Testing file uploads to Storage')
    
    const filePrefix = `${agreementId}/${Date.now()}`
    
    // Тест загрузки подписи
    try {
      const { data: signatureUpload, error: signatureUploadError } = await supabase.storage
        .from('nda-files')
        .upload(`${filePrefix}/signature.png`, signatureBuffer, {
          contentType: 'image/png'
        })
      
      if (signatureUploadError) {
        console.error('Step 10a ERROR: Signature upload failed:', signatureUploadError)
        return NextResponse.json({ 
          error: 'Ошибка загрузки подписи',
          step: 10,
          details: signatureUploadError.message
        }, { status: 500 })
      }
      
      console.log('Step 10a: Signature uploaded successfully:', signatureUpload.path)
    } catch (uploadError) {
      console.error('Step 10a ERROR: Signature upload exception:', uploadError)
      return NextResponse.json({ 
        error: 'Критическая ошибка загрузки подписи',
        step: 10,
        details: uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
      }, { status: 500 })
    }

    // Тест загрузки фото паспорта
    try {
      const passportBuffer = await passportPhoto.arrayBuffer()
      const { data: passportUpload, error: passportUploadError } = await supabase.storage
        .from('nda-files')
        .upload(`${filePrefix}/passport.${passportPhoto.name.split('.').pop()}`, passportBuffer, {
          contentType: passportPhoto.type
        })
      
      if (passportUploadError) {
        console.error('Step 10b ERROR: Passport upload failed:', passportUploadError)
        return NextResponse.json({ 
          error: 'Ошибка загрузки фото паспорта',
          step: 10,
          details: passportUploadError.message
        }, { status: 500 })
      }
      
      console.log('Step 10b: Passport photo uploaded successfully:', passportUpload.path)
    } catch (uploadError) {
      console.error('Step 10b ERROR: Passport upload exception:', uploadError)
      return NextResponse.json({ 
        error: 'Критическая ошибка загрузки фото паспорта',
        step: 10,
        details: uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
      }, { status: 500 })
    }

    // Тест загрузки селфи
    try {
      const selfieBuffer = await selfieWithPassport.arrayBuffer()
      const { data: selfieUpload, error: selfieUploadError } = await supabase.storage
        .from('nda-files')
        .upload(`${filePrefix}/selfie.${selfieWithPassport.name.split('.').pop()}`, selfieBuffer, {
          contentType: selfieWithPassport.type
        })
      
      if (selfieUploadError) {
        console.error('Step 10c ERROR: Selfie upload failed:', selfieUploadError)
        return NextResponse.json({ 
          error: 'Ошибка загрузки селфи',
          step: 10,
          details: selfieUploadError.message
        }, { status: 500 })
      }
      
      console.log('Step 10c: Selfie uploaded successfully:', selfieUpload.path)
    } catch (uploadError) {
      console.error('Step 10c ERROR: Selfie upload exception:', uploadError)
      return NextResponse.json({ 
        error: 'Критическая ошибка загрузки селфи',
        step: 10,
        details: uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
      }, { status: 500 })
    }

    console.log('Step 10: All files uploaded successfully')

    // Тест обновления соглашения
    console.log('Step 11: Testing agreement update')
    try {
      const { data: updateResult, error: updateError } = await supabase
        .from('nda_agreements')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          full_name: fullName,
          date_of_birth: dateOfBirth,
          email: email,
          document_number: documentNumber,
          issuance_address: issuanceAddress,
          issuance_date: issuanceDate,
          residential_address: residentialAddress
        })
        .eq('id', agreementId)
        .select()

      if (updateError) {
        console.error('Step 11 ERROR: Agreement update failed:', updateError)
        return NextResponse.json({ 
          error: 'Ошибка обновления соглашения',
          step: 11,
          details: updateError.message
        }, { status: 500 })
      }

      console.log('Step 11: Agreement updated successfully:', updateResult)
    } catch (updateError) {
      console.error('Step 11 ERROR: Agreement update exception:', updateError)
      return NextResponse.json({ 
        error: 'Критическая ошибка обновления соглашения',
        step: 11,
        details: updateError instanceof Error ? updateError.message : 'Unknown update error'
      }, { status: 500 })
    }

    console.log('=== NDA SIGN TEST COMPLETED SUCCESSFULLY ===')

    return NextResponse.json({
      success: true,
      message: 'Тест подписания NDA прошел успешно!',
      steps: {
        1: 'Supabase client created',
        2: 'FormData received',
        3: 'Form data extracted',
        4: 'Required fields validated',
        5: 'Signature validated',
        6: 'Files validated',
        7: 'Agreement found',
        8: 'Agreement status verified',
        9: 'Signature processed',
        10: 'Files uploaded to Storage',
        11: 'Agreement updated'
      }
    })

  } catch (error) {
    console.error('=== NDA SIGN TEST CRITICAL ERROR ===')
    console.error('Error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({ 
      error: 'Критическая ошибка теста',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
