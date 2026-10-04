FRIOS PA - V1 LOCAL

TESTE RÁPIDO:
1. Extraia este ZIP.
2. Para testar como PWA pelo navegador, publique os arquivos em GitHub Pages.
3. Abra no Chrome do celular.
4. Cadastre produtos e teste a ordenação e as TAGs.

IMPORTANTE:
- Esta versão é LOCAL.
- Os produtos ficam no armazenamento do próprio navegador.
- Login, Supabase, banco em nuvem, realtime e notificações reais serão conectados na próxima etapa.
- Nenhum dado desta versão se conecta ao Vencimento PA ou ao Promotor PA.

TESTE SUGERIDO:
Produto A:
Vencimento em 4 dias / TAG 12

Produto B:
Vencimento em 8 dias / TAG 15

Produto C:
Vencimento em 12 dias / TAG 7

Depois abra Vencimentos e confirme que aparecem do vencimento mais próximo para o mais distante.


FRIOS PA — VERSÃO CLOUD / SUPABASE

Esta versão usa exclusivamente o Supabase para autenticação e produtos.
Projeto Supabase: Frios-PA
URL: https://nomcmgegvdkmqfsiutdd.supabase.co

Login:
- O e-mail e senha são validados pelo Supabase Auth.
- Sessão persistente é gerenciada pelo Supabase.
- O perfil precisa existir em public.profiles e estar active=true.
- Ramon está configurado como role=admin.

Produtos:
- Leitura, cadastro, edição, exclusão lógica e PLU usam public.products.
- Fotos usam o bucket frios-produtos.
- Alterações são atualizadas em tempo real via Realtime.

IMPORTANTE:
- Não há mais credencial local admin/123456.
- A chave usada no navegador é a publishable key do projeto Supabase.
