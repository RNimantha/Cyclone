const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables');
}
export const handler = async (event) => {
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
    // Check Supabase configuration
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('Missing Supabase environment variables');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Supabase not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables in Netlify.',
                photos: []
            }),
        };
    }
    try {
        if (event.httpMethod === 'GET') {
            const queryParams = event.queryStringParameters || {};
            const limit = Math.min(Math.max(parseInt(queryParams.limit || '10', 10) || 10, 1), 20);
            const offset = Math.max(parseInt(queryParams.offset || '0', 10) || 0, 0);
            // Fetch all photos ordered by display_order
            const response = await fetch(`${SUPABASE_URL}/rest/v1/gallery_photos?select=*&order=display_order.asc&order=created_at.desc&limit=${limit}&offset=${offset}`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'count=exact',
                },
            });
            if (!response.ok) {
                // If table doesn't exist (404), return empty array instead of error
                if (response.status === 404 || response.status === 400) {
                    console.warn('Gallery photos table may not exist yet');
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ photos: [] }),
                    };
                }
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Supabase error (${response.status}): ${errorText}`);
            }
            const photos = await response.json();
            const contentRange = response.headers.get('content-range');
            const total = contentRange ? parseInt(contentRange.split('/')[1], 10) : undefined;
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ photos, total, limit, offset }),
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
            const response = await fetch(`${SUPABASE_URL}/rest/v1/gallery_photos`, {
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
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Supabase error: ${response.statusText} - ${errorText}`);
            }
            const photo = await response.json();
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
            const updateData = { updated_at: new Date().toISOString() };
            if (url !== undefined)
                updateData.url = url;
            if (caption !== undefined)
                updateData.caption = caption;
            if (display_order !== undefined)
                updateData.display_order = display_order;
            const response = await fetch(`${SUPABASE_URL}/rest/v1/gallery_photos?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify(updateData),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Supabase error: ${response.statusText} - ${errorText}`);
            }
            const photo = await response.json();
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
            const response = await fetch(`${SUPABASE_URL}/rest/v1/gallery_photos?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
            });
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
    }
    catch (error) {
        console.error('Photos API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Internal server error' }),
        };
    }
};
