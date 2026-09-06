import { InstitutionalPanel } from "@/components/auth/institutional-panel";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <div className="flex min-h-screen flex-col md:grid md:grid-cols-[42fr_58fr] md:items-stretch lg:grid-cols-[55fr_45fr]">
      <InstitutionalPanel />

      <div className="-mt-8 flex flex-1 flex-col rounded-t-[32px] bg-background px-6 pt-9 pb-10 sm:px-8 md:mt-0 md:items-center md:justify-center md:rounded-none md:px-6 md:py-10">
        <div className="mx-auto w-full max-w-[520px]">
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
