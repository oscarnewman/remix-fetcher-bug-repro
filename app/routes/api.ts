export async function loader() {
  // wait 500ms
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { message: "Hello World!" };
}
