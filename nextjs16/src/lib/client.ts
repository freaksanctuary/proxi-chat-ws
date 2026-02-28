import { treaty } from "@elysiajs/eden";
import type { App } from "../app/api/[[...slugs]]/route";

export const client = treaty<App>("https://chat.imnopas.me").api;
//export const client = treaty<App>("http://localhost").api;
