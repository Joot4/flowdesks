import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface CreateCollaboratorPayload {
  email: string;
  password: string;
  full_name: string;
  employee_code?: string;
  phone?: string;
  job_title?: string;
}

async function getAuthUserIdByEmail(adminClient: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await adminClient.schema('auth').from('users').select('id').eq('email', email).maybeSingle<{ id: string }>();
  if (error) {
    return null;
  }
  return data?.id ?? null;
}

async function sendCredentialsEmail(
  apiKey: string,
  from: string,
  to: string,
  fullName: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>Seu acesso foi criado</h2>
      <p>Ola, ${fullName}.</p>
      <p>Seu acesso ao sistema de calendario foi criado com sucesso.</p>
      <p><strong>Email:</strong> ${to}</p>
      <p><strong>Senha inicial:</strong> ${password}</p>
      <p>Por seguranca, altere sua senha no primeiro acesso.</p>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject: 'Seu acesso ao Controle de Calendario',
      html
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    return { ok: false, error: `Falha ao enviar email: ${response.status} ${errBody}` };
  }

  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Configuracao do Supabase incompleta na edge function.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token de autenticacao ausente.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: callerAuth, error: callerAuthError } = await callerClient.auth.getUser();
    if (callerAuthError || !callerAuth.user) {
      return new Response(JSON.stringify({ error: 'Usuario autenticado invalido.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: callerProfile, error: callerProfileError } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', callerAuth.user.id)
      .maybeSingle<{ role: 'SUPER_ADMIN' | 'ADMIN' | 'COLLABORATOR' }>();

    if (callerProfileError || !callerProfile || !['ADMIN', 'SUPER_ADMIN'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Sem permissao para criar colaborador.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = (await req.json()) as CreateCollaboratorPayload;
    if (!payload.email || !payload.password || !payload.full_name) {
      return new Response(JSON.stringify({ error: 'Campos obrigatorios: email, senha e nome.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (payload.password.length < 6) {
      return new Response(JSON.stringify({ error: 'Senha deve ter pelo menos 6 caracteres.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: { full_name: payload.full_name }
    });

    let userId: string | null = createdUser.user?.id ?? null;

    if (createUserError) {
      const duplicate = createUserError.message.toLowerCase().includes('already been registered');
      if (!duplicate) {
        return new Response(JSON.stringify({ error: createUserError.message ?? 'Falha ao criar usuario no auth.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      userId = await getAuthUserIdByEmail(adminClient, payload.email);
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Email ja existe no Auth, mas nao foi possivel localizar o usuario.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, {
        password: payload.password,
        user_metadata: { full_name: payload.full_name }
      });

      if (updateAuthError) {
        return new Response(JSON.stringify({ error: `Falha ao atualizar senha do usuario existente: ${updateAuthError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Falha ao resolver usuario no Auth.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error: rpcError } = await callerClient.rpc('create_collaborator_by_email', {
      p_email: payload.email,
      p_full_name: payload.full_name,
      p_employee_code: payload.employee_code ?? null,
      p_phone: payload.phone ?? null,
      p_job_title: payload.job_title ?? null
    });

    if (rpcError) {
      return new Response(JSON.stringify({ error: `Falha ao vincular colaborador no banco: ${rpcError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let emailSent = false;
    let emailError: string | undefined;

    if (resendApiKey && resendFromEmail) {
      const sendResult = await sendCredentialsEmail(resendApiKey, resendFromEmail, payload.email, payload.full_name, payload.password);
      emailSent = sendResult.ok;
      emailError = sendResult.error;
    } else {
      emailError = 'Secrets de email nao configuradas (RESEND_API_KEY e RESEND_FROM_EMAIL).';
    }

    return new Response(JSON.stringify({ id: userId, email_sent: emailSent, email_error: emailError }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
