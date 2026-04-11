import { Body, Controller, Post } from "@nestjs/common";
import { AuthDto } from "../dtos/auth.dto";
import { AppStoreService } from "../store/app-store.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly store: AppStoreService) {}

  @Post("register")
  async register(@Body() body: AuthDto) {
    const user = await this.store.createUser(body.email, body.password);
    return {
      ok: true,
      userId: user.id,
      email: user.email,
      token: `auth-${user.id}`,
      message: "Registration succeeded."
    };
  }

  @Post("login")
  async login(@Body() body: AuthDto) {
    const user = await this.store.authenticate(body.email, body.password);
    if (!user) {
      return { ok: false, message: "Invalid credentials" };
    }
    return {
      ok: true,
      userId: user.id,
      email: user.email,
      token: `auth-${user.id}`,
      message: "Login succeeded."
    };
  }

  @Post("logout")
  logout() {
    return { ok: true };
  }
}
