import Head from "next/head";

export function PublicLayout({ children, title }) {
  const pageTitle = title ? `${title} | Serverlog` : "Serverlog";

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      {children}
    </>
  );
}
