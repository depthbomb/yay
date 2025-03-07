import { Container } from './container';

export class containerModule {
	public static bootstrap() {
		return new Container();
	}
}
