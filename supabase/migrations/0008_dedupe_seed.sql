-- POLIBRILHO — remove duplicatas de unidades/serviços criadas por uma
-- reexecução acidental do 0003_seed.sql, e evita que isso volte a
-- acontecer. Para cada nome duplicado, mantém a linha mais antiga
-- (criado_em) e reaponta todas as referências (OS, itens, preços,
-- orçamentos, executores, despesas, usuários) para ela antes de apagar
-- as duplicatas. Idempotente: rodar sem duplicatas não altera nada.

-- ===== SERVIÇOS =====
create temporary table _mapa_servicos as
select id as antigo, first_value(id) over (partition by nome order by criado_em, id) as canonico
from servicos;

update os_itens oi set servico_id = m.canonico
from _mapa_servicos m
where oi.servico_id = m.antigo and m.antigo <> m.canonico;

update orcamento_itens oi set servico_id = m.canonico
from _mapa_servicos m
where oi.servico_id = m.antigo and m.antigo <> m.canonico;

-- preços: reaponta e descarta qualquer linha que colidiria com uma já
-- existente no serviço canônico (mesma unidade + porte)
update precos p set servico_id = m.canonico
from _mapa_servicos m
where p.servico_id = m.antigo and m.antigo <> m.canonico
  and not exists (
    select 1 from precos p2
    where p2.servico_id = m.canonico
      and p2.unidade_id = p.unidade_id
      and p2.porte is not distinct from p.porte
  );

delete from precos p
using _mapa_servicos m
where p.servico_id = m.antigo and m.antigo <> m.canonico;

delete from servicos s
using _mapa_servicos m
where s.id = m.antigo and m.antigo <> m.canonico;

drop table _mapa_servicos;

create unique index if not exists servicos_nome_key on servicos (nome);

-- ===== UNIDADES =====
create temporary table _mapa_unidades as
select id as antigo, first_value(id) over (partition by nome order by criado_em, id) as canonico
from unidades;

update usuarios u set unidade_id = m.canonico
from _mapa_unidades m
where u.unidade_id = m.antigo and m.antigo <> m.canonico;

update ordens_servico o set unidade_id = m.canonico
from _mapa_unidades m
where o.unidade_id = m.antigo and m.antigo <> m.canonico;

update orcamentos o set unidade_id = m.canonico
from _mapa_unidades m
where o.unidade_id = m.antigo and m.antigo <> m.canonico;

update executores e set unidade_id = m.canonico
from _mapa_unidades m
where e.unidade_id = m.antigo and m.antigo <> m.canonico;

update despesas d set unidade_id = m.canonico
from _mapa_unidades m
where d.unidade_id = m.antigo and m.antigo <> m.canonico;

update precos p set unidade_id = m.canonico
from _mapa_unidades m
where p.unidade_id = m.antigo and m.antigo <> m.canonico
  and not exists (
    select 1 from precos p2
    where p2.unidade_id = m.canonico
      and p2.servico_id = p.servico_id
      and p2.porte is not distinct from p.porte
  );

delete from precos p
using _mapa_unidades m
where p.unidade_id = m.antigo and m.antigo <> m.canonico;

delete from unidades u
using _mapa_unidades m
where u.id = m.antigo and m.antigo <> m.canonico;

drop table _mapa_unidades;

create unique index if not exists unidades_nome_key on unidades (nome);
