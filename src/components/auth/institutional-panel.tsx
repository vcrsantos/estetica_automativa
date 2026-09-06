const BENEFICIOS = [
  { titulo: "Agenda", texto: "Mais organização" },
  { titulo: "Clientes", texto: "Relacionamentos mais fortes" },
  { titulo: "Resultados", texto: "Crescimento contínuo" },
];

export function InstitutionalPanel() {
  return (
    <div className="relative h-[38vh] max-h-[340px] min-h-[220px] shrink-0 overflow-hidden bg-[#1c1c1c] md:h-auto md:max-h-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- foto estática em public/, mesmo padrão da logo (sem next/image no projeto) */}
      <img
        src="/login-institucional.png"
        alt=""
        className="absolute inset-0 size-full object-cover object-top"
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 hidden h-full flex-col justify-end p-10 text-white lg:flex xl:p-14">
        <h1 className="max-w-md text-[44px] leading-[1.05] font-bold xl:text-[52px]">
          Gestão que mantém seu negócio sempre brilhando.
        </h1>
        <p className="mt-4 max-w-sm text-lg text-white/80">
          Clientes, serviços, agenda e resultados em um só lugar.
        </p>
        <ul className="mt-8 flex flex-col gap-2.5 text-sm text-white/90">
          {BENEFICIOS.map((b) => (
            <li key={b.titulo} className="flex items-center gap-2">
              <span className="size-1.5 shrink-0 rounded-full bg-[#f5c400]" />
              <span className="font-medium">{b.titulo}</span>
              <span className="text-white/60">— {b.texto}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tablet: só título + subtítulo, sem os benefícios (seção 8 do documento) */}
      <div className="relative z-10 hidden h-full flex-col justify-end p-8 text-white md:flex lg:hidden">
        <h1 className="max-w-xs text-[38px] leading-[1.05] font-bold">
          Gestão que mantém seu negócio sempre brilhando.
        </h1>
        <p className="mt-3 max-w-xs text-base text-white/80">
          Clientes, serviços, agenda e resultados em um só lugar.
        </p>
      </div>
    </div>
  );
}
