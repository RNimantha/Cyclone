import type { Handler } from '@netlify/functions';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables');
}

interface Photo {
    id: number;
    url: string;
    caption?: string;
    display_order: number;
    created_at: string;
    updated_at: string;
}

export const handler: Handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json',
    };

    // Handle OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    try {
        if (event.httpMethod === 'GET') {
            // Fetch all photos ordered by display_order
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/gallery_photos?select=*&order=display_order.asc,created_at.desc`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Supabase error: ${response.statusText}`);
            }

            const photos: Photo[] = await response.json();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ photos }),
            };
        }

        if (event.httpMethod === 'POST') {
            // Add a new photo
            const { url, caption, display_order } = JSON.parse(event.body || '{}');

            if (!url) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'URL is required' }),
                };
            }

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/gallery_photos`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: JSON.stringify({
                        url,
                        caption: caption || null,
                        display_order: display_order || 0,
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Supabase error: ${response.statusText} - ${errorText}`);
            }

            const photo: Photo[] = await response.json();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ photo: photo[0] }),
            };
        }

        if (event.httpMethod === 'PUT') {
            // Update a photo
            const { id, url, caption, display_order } = JSON.parse(event.body || '{}');

            if (!id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'ID is required' }),
                };
            }

            const updateData: any = { updated_at: new Date().toISOString() };
            if (url !== undefined) updateData.url = url;
            if (caption !== undefined) updateData.caption = caption;
            if (display_order !== undefined) updateData.display_order = display_order;

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/gallery_photos?id=eq.${id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: JSON.stringify(updateData),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Supabase error: ${response.statusText} - ${errorText}`);
            }

            const photo: Photo[] = await response.json();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ photo: photo[0] }),
            };
        }

        if (event.httpMethod === 'DELETE') {
            // Delete a photo
            const id = event.queryStringParameters?.id;

            if (!id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'ID is required' }),
                };
            }

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/gallery_photos?id=eq.${id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Supabase error: ${response.statusText} - ${errorText}`);
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true }),
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    } catch (error: any) {
        console.error('Photos API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Internal server error' }),
        };
    }
};

