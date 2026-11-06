import { ActionPanel, Icon, List } from "@vicinae/api";
import type { ReactNode } from "react";
import type { TranslateError } from "../lib/errors";
import type { ProviderId, TranslationProvider } from "../providers/types";
import { ErrorActions, ProviderActions } from "./actions";

export function ErrorEmptyView({
	error,
	provider,
	onProviderChange,
	children,
}: {
	error: TranslateError;
	provider: TranslationProvider;
	onProviderChange: (id: ProviderId) => void;
	children?: ReactNode;
}) {
	return (
		<List.EmptyView
			icon={Icon.Warning}
			title={error.title}
			description={error.detail}
			actions={
				<ActionPanel>
					{error.kind === "config" && <ErrorActions provider={provider} />}
					<ProviderActions provider={provider} onChange={onProviderChange} />
					{children}
				</ActionPanel>
			}
		/>
	);
}
