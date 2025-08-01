declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
    interface ImportMetaEnv {
        readonly PUBLIC_BACKEND_URL: string;
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}

export {};
