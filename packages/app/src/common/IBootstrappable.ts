export interface IBootstrappable {
	bootstrap(): Promise<void>;
}
