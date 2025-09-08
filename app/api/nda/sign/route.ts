import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
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

    console.log('NDA Sign API called:', { 
      agreementId, 
      fullName, 
      email,
      hasSignature: !!signature,
      signatureLength: signature?.length,
      hasPassportPhoto: !!passportPhoto,
      hasSelfie: !!selfieWithPassport
    })

    // Проверяем обязательные поля
    if (!agreementId || !fullName || !dateOfBirth || !email || !documentNumber || 
        !issuanceAddress || !issuanceDate || !residentialAddress) {
      return NextResponse.json({ 
        error: 'Все поля обязательны для заполнения' 
      }, { status: 400 })
    }

    // Проверяем подпись и файлы
    if (!signature) {
      return NextResponse.json({ 
        error: 'Электронная подпись обязательна' 
      }, { status: 400 })
    }

    if (!passportPhoto || !selfieWithPassport) {
      return NextResponse.json({ 
        error: 'Фото документа и селфи обязательны для загрузки' 
      }, { status: 400 })
    }

    // Проверяем существование соглашения
    const { data: agreement, error: agreementError } = await supabase
      .from('nda_agreements')
      .select('id, user_id, template_id, status')
      .eq('id', agreementId)
      .single()

    if (agreementError || !agreement) {
      console.error('Agreement not found:', agreementError)
      return NextResponse.json({ 
        error: 'Соглашение не найдено' 
      }, { status: 404 })
    }

    if (agreement.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Соглашение уже подписано или отменено' 
      }, { status: 400 })
    }

    // Загружаем файлы в Supabase Storage
    const timestamp = Date.now()
    const filePrefix = `nda/${agreementId}/${timestamp}`

    // Сохраняем подпись как изображение
    let signatureData = signature
    if (signature.includes(',')) {
      signatureData = signature.split(',')[1]
    }
    const signatureBuffer = Buffer.from(signatureData, 'base64')
    const { data: signatureUpload, error: signatureUploadError } = await supabase.storage
      .from('nda-files')
      .upload(`${filePrefix}/signature.png`, signatureBuffer, {
        contentType: 'image/png'
      })

    if (signatureUploadError) {
      console.error('Signature upload error:', signatureUploadError)
      return NextResponse.json({ 
        error: 'Ошибка сохранения подписи' 
      }, { status: 500 })
    }

    // Загружаем фото паспорта
    const { data: passportUpload, error: passportUploadError } = await supabase.storage
      .from('nda-files')
      .upload(`${filePrefix}/passport-photo.jpg`, passportPhoto)

    if (passportUploadError) {
      console.error('Passport upload error:', passportUploadError)
      return NextResponse.json({ 
        error: 'Ошибка загрузки фото паспорта' 
      }, { status: 500 })
    }

    // Загружаем селфи с паспортом
    const { data: selfieUpload, error: selfieUploadError } = await supabase.storage
      .from('nda-files')
      .upload(`${filePrefix}/selfie-with-passport.jpg`, selfieWithPassport)

    if (selfieUploadError) {
      console.error('Selfie upload error:', selfieUploadError)
      return NextResponse.json({ 
        error: 'Ошибка загрузки селфи с паспортом' 
      }, { status: 500 })
    }

    // Создаем записи файлов в базе данных
    const fileRecords = [
      {
        agreement_id: agreementId,
        file_type: 'signature',
        file_path: signatureUpload.path,
        original_filename: 'signature.png'
      },
      {
        agreement_id: agreementId,
        file_type: 'passport_photo',
        file_path: passportUpload.path,
        original_filename: passportPhoto.name
      },
      {
        agreement_id: agreementId,
        file_type: 'selfie_with_passport',
        file_path: selfieUpload.path,
        original_filename: selfieWithPassport.name
      }
    ]

    const { error: filesError } = await supabase
      .from('nda_files')
      .insert(fileRecords)

    if (filesError) {
      console.error('Files insert error:', filesError)
      return NextResponse.json({ 
        error: 'Ошибка сохранения информации о файлах' 
      }, { status: 500 })
    }

    // Обновляем соглашение
    const { error: updateError } = await supabase
      .from('nda_agreements')
      .update({
        status: 'signed',
        signed_date: new Date().toISOString(),
        full_name: fullName,
        date_of_birth: dateOfBirth,
        email: email,
        document_number: documentNumber,
        issuance_address: issuanceAddress,
        issuance_date: issuanceDate,
        residential_address: residentialAddress
      })
      .eq('id', agreementId)

    if (updateError) {
      console.error('Agreement update error:', updateError)
      return NextResponse.json({ 
        error: 'Ошибка обновления соглашения' 
      }, { status: 500 })
    }

    // Обновляем пользователя
    if (agreement.user_id) {
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          nda_signed: true,
          nda_signed_date: new Date().toISOString(),
          nda_agreement_id: agreementId
        })
        .eq('id', agreement.user_id)

      if (userUpdateError) {
        console.error('User update error:', userUpdateError)
        // Не возвращаем ошибку, так как основная задача выполнена
      }
    }

    return NextResponse.json({
      success: true,
      message: 'NDA успешно подписан',
      agreementId: agreementId
    })

  } catch (error) {
    console.error('NDA Sign API Error:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
