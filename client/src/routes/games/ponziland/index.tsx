import { fetchState } from "@/games/ponziland/context";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/games/ponziland/")({
  async loader(ctx) {
    const state = await fetchState(
      "0x771d322f7f75dd486742a335a9503a7f7a6791dd72c175177e376d23fff75ae"
    );

    console.log({ state });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/games/ponziland/"!</div>;
}
