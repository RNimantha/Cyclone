import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables');
}
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
export const handler = async (event) => {
    // Handle CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
            },
            body: ''
        };
    }
    if (!supabase) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Supabase not configured' })
        };
    }
    try {
        if (event.httpMethod === 'POST') {
            // Store analytics data
            const body = JSON.parse(event.body || '{}');
            const { type, data } = body;
            if (!type || !data) {
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ error: 'Missing type or data' })
                };
            }
            let result;
            switch (type) {
                case 'visit':
                    result = await supabase
                        .from('visits')
                        .insert([{
                            visitor_id: data.visitorId,
                            timestamp: data.timestamp,
                            user_agent: data.userAgent,
                            referrer: data.referrer,
                            url: data.url,
                            screen_width: data.screenWidth,
                            screen_height: data.screenHeight
                        }]);
                    break;
                case 'event':
                    result = await supabase
                        .from('events')
                        .insert([{
                            visitor_id: data.visitorId,
                            event_type: data.type,
                            event_label: data.label,
                            timestamp: data.timestamp
                        }]);
                    break;
                case 'login_visit':
                    result = await supabase
                        .from('login_visits')
                        .insert([{
                            page: data.page,
                            timestamp: data.timestamp,
                            user_agent: data.userAgent,
                            referrer: data.referrer,
                            url: data.url
                        }]);
                    break;
                case 'login_attempt':
                    result = await supabase
                        .from('login_attempts')
                        .insert([{
                            success: data.success,
                            timestamp: data.timestamp,
                            user_agent: data.userAgent,
                            attempted_password_length: data.attemptedPasswordLength
                        }]);
                    break;
                default:
                    return {
                        statusCode: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({ error: 'Invalid type' })
                    };
            }
            if (result.error) {
                throw result.error;
            }
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ success: true })
            };
        }
        else if (event.httpMethod === 'GET') {
            // Retrieve analytics data
            const { data: visits, error: visitsError } = await supabase
                .from('visits')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(1000);
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(500);
            const { data: loginVisits, error: loginVisitsError } = await supabase
                .from('login_visits')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(500);
            const { data: loginAttempts, error: loginAttemptsError } = await supabase
                .from('login_attempts')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(500);
            if (visitsError || eventsError || loginVisitsError || loginAttemptsError) {
                throw visitsError || eventsError || loginVisitsError || loginAttemptsError;
            }
            // Transform data to match frontend format
            const transformedVisits = visits?.map(v => ({
                visitorId: v.visitor_id,
                timestamp: v.timestamp,
                userAgent: v.user_agent,
                referrer: v.referrer,
                url: v.url,
                screenWidth: v.screen_width,
                screenHeight: v.screen_height
            })) || [];
            const transformedEvents = events?.map(e => ({
                type: e.event_type,
                label: e.event_label,
                timestamp: e.timestamp,
                visitorId: e.visitor_id
            })) || [];
            const transformedLoginVisits = loginVisits?.map(lv => ({
                page: lv.page,
                timestamp: lv.timestamp,
                userAgent: lv.user_agent,
                referrer: lv.referrer,
                url: lv.url
            })) || [];
            const transformedLoginAttempts = loginAttempts?.map(la => ({
                success: la.success,
                timestamp: la.timestamp,
                userAgent: la.user_agent,
                attemptedPasswordLength: la.attempted_password_length
            })) || [];
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    visits: transformedVisits,
                    events: transformedEvents,
                    loginVisits: transformedLoginVisits,
                    loginAttempts: transformedLoginAttempts
                })
            };
        }
        else {
            return {
                statusCode: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }
    }
    catch (error) {
        console.error('Analytics error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};
