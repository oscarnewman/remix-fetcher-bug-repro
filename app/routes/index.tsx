import type { LoaderArgs } from "@remix-run/node";
import {
  Await,
  Form,
  useFetcher,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { Suspense, useState } from "react";

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  const foo = url.searchParams.get("foo");

  // 2 second timeout on data
  const data = await new Promise((resolve) => {
    setTimeout(() => {
      resolve({ foo });
    }, 1000);
  });

  return { data };
}

export default function Index() {
  const { data } = useLoaderData();

  const [open, setOpen] = useState(false);
  const navigation = useNavigation();

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        lineHeight: "1.4",
        maxWidth: "960px",
        margin: "0 auto",
      }}
    >
      <h1>Welcome to Remix</h1>

      <p>
        This is a reproduction of two (related) issues, related to fetchers and
        Forms.
      </p>

      <p>
        Best I can tell, on the same route, a <code>fetcher</code> somehow
        pollutes a regular <code>Form</code> tag's internal <code>fetcher</code>{" "}
        instance as soon as <code>fetcher.load</code> is called.
      </p>

      <p>
        This is concerning on its own, but leads to problems once that new
        fetcher is unmounted, creating scenarios where the form is stuck loading
        infinitely.
      </p>

      <details open>
        <summary>
          <strong>Steps to reproduce</strong>
        </summary>

        <ol>
          <li>Open your network tab and filter to XHR only</li>
          <li>
            Submit the first form, verify that it works as expected and the
            value updates in the UI. Only one XHR request should be made.
          </li>
          <li>Click "Show async form"</li>
          <li>
            Click "Submit query" in the first from again. It should work as
            expected still.
          </li>
          <li>
            Now, click "Trigger fetcher" which will call{" "}
            <code>fetcher.load(`/api`)</code> to retrieve a message. Only the
            fetcher state should change, and only one XHR request should be made
            (to the /api route).
          </li>
          <li>
            <strong>This is where it goes wrong:</strong> Click "Submit query"
            on the main form again. Now:
            <ul>
              <li>
                You will see two XHR requests, one to `/` and one to `/api`,
                when we only expect to see one to `/`
              </li>
              <li>
                The fetcher's state will change to loading when it should not
              </li>
            </ul>
          </li>

          <li>
            <strong>Now for the bigger issue:</strong> Inside of the second
            form, the "Submit main form" button is a <code>type="submit"</code>{" "}
            button which targets the first form with the{" "}
            <code>form="main-form"</code> attribute. This button also closes
            (removes from the dom tree) the second form when clicked, with a
            250ms delay. What happens now is:
            <ol>
              <li>
                Both the fetcher and the navigation state show as{" "}
                <code>loading</code>, whereas only hte navigation state should.
              </li>
              <li>
                As soon as the async form unmounts (including it's fetcher), the
                open XHR request from the form submission dies.
              </li>
              <li>
                The navigation state is permanently stuck as <code>loading</code>.
              </li>
            </ol>
          </li>
        </ol>
      </details>

      <fieldset>
        <legend>
          Basic GET Form <code>id="main-form"</code>
        </legend>
        <p>navigation state: {navigation.state}</p>
        <p>value: {data.foo}</p>
        <Form id="main-form" preventScrollReset>
          <input type="text" name="foo" defaultValue={data.foo} />
          <br />
          <input type="submit" />
        </Form>
      </fieldset>

      <fieldset>
        <legend>Async fetcher form</legend>
        <button onClick={() => setOpen(true)}>Show async form</button>
        {open && <Child onClose={() => setOpen(false)} />}
      </fieldset>
    </div>
  );
}

function Child({ onClose }: { onClose: () => void }) {
  const fetcher = useFetcher();

  return (
    <fetcher.Form method="get" action="/api">
      <p>fetcher state: {fetcher.state}</p>
      <p>data: {JSON.stringify(fetcher.data)}</p>
      <button type="submit">Trigger fetcher (shows a message)</button>
      <br />
      <button
        type="submit"
        form="main-form"
        onClick={() => {
          setTimeout(() => {
            onClose();
          }, 250);
        }}
      >
        Submit main form and close async form
      </button>
    </fetcher.Form>
  );
}
