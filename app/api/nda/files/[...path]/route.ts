import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Создаем клиент с service role для доступа к файлам
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const filePath = params.path.join('/')
    
    console.log('Requesting file:', filePath)

    // Получаем файл из Storage
    const { data, error } = await supabase.storage
      .from('nda-files')
      .download(filePath)

    if (error) {
      console.error('File download error:', error)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Определяем MIME тип по расширению файла
    const extension = filePath.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (extension) {
      case 'png':
        contentType = 'image/png'
        break
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'pdf':
        contentType = 'application/pdf'
        break
      case 'txt':
        contentType = 'text/plain'
        break
    }

    // Возвращаем файл
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filePath.split('/').pop()}"`
      }
    })

  } catch (error) {
    console.error('File API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
