import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import path from 'path';
import supabase from '@/supabase';

export const config = {
    api: {
        bodyParser: false,
    },
};

const uploadDir = path.join(process.cwd(), '/tmp');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const parseForm = (req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
    const form = new formidable.IncomingForm({
        uploadDir,
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'メソッドが許可されていません。' });
        return;
    }

    try {
        const { fields, files } = await parseForm(req);

        const file = files.file as File;
        if (!file) {
            res.status(400).json({ error: 'ファイルがアップロードされていません。' });
            return;
        }

        // ファイルタイプとサイズの検証
        const allowedTypes = ['application/pdf', 'text/plain'];
        if (!allowedTypes.includes(file.mimetype || '')) {
            res.status(400).json({ error: '許可されていないファイル形式です。PDFまたはテキストファイルのみアップロード可能です。' });
            return;
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            res.status(400).json({ error: 'ファイルサイズが大きすぎます。最大10MBまで許可されています。' });
            return;
        }

        // 一時ストレージからSupabase Storageへアップロード
        const fileExt = file.newFilename.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const userId = fields.user_id as string;

        if (!userId) {
            res.status(400).json({ error: 'ユーザーIDが提供されていません。' });
            return;
        }

        const filePath = `${userId}/${fileName}`;

        const fileStream = fs.createReadStream(file.filepath);

        const { data, error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filePath, fileStream, {
                cacheControl: '3600',
                upsert: false,
            });

        // 一時ファイルを削除
        fs.unlinkSync(file.filepath);

        if (uploadError) {
            res.status(500).json({ error: 'ファイルのアップロードに失敗しました。' });
            return;
        }

        // データベースにファイル情報を記録
        const { data: insertData, error: dbError } = await supabase
            .from('documents')
            .insert([
                {
                    project_id: fields.project_id || 'プロジェクトIDをここに入力',
                    type: file.mimetype?.includes('pdf') ? 'PDF' : 'テキスト',
                    content: JSON.stringify({ title: file.originalFilename || 'タイトル未設定', sections: [] }),
                },
            ]);

        if (dbError) {
            res.status(500).json({ error: 'データベースへの記録に失敗しました。' });
            return;
        }

        res.status(200).json({
            message: 'ファイルが正常にアップロードされました。',
            filePath: data.path,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '内部サーバーエラーが発生しました。' });
    }
};

export default handler;