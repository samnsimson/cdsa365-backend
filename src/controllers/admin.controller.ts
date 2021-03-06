import { Request, Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { PoolConnection } from "mysql2/promise";
import uniqid from "uniqid";
import DB from "../constructs/db";
import { formatPhone, generateSecrets } from "../helpers/helpers";
import {
    create_new_user,
    delete_user,
    find_admin,
    get_all_users,
    search_for_user,
} from "../queries/admin_queries";
import DataTransformer from "../services/data-transform-service";
import EmailService from "../services/mail-service";
import { TransportInfo, UserCreationEmailContext } from "../types/types";

const { ADMIN_PORTAL } = process.env;
export default class AdminController {
    private readonly db: DB;
    private readonly transformer: DataTransformer;
    private readonly emailService: EmailService;

    constructor() {
        this.db = new DB();
        this.transformer = new DataTransformer();
        this.emailService = new EmailService();
    }

    public getAdmin = async (req: Request, res: Response) => {
        const conn = await this.db.getConnection();
        try {
            const { id } = req.params;
            if (id) {
                const [[result]] = await conn.query<RowDataPacket[]>(
                    find_admin,
                    [id]
                );
                if (result) {
                    res.status(200).json(result);
                } else {
                    res.status(404).json({
                        error: true,
                        message: "User not found!",
                    });
                }
            }
        } catch (error: any) {
            res.status(500).json({ error: true, message: error.message });
        } finally {
            conn.release();
        }
    };

    public getAllAdmins = async (req: Request, res: Response) => {
        const conn = await this.db.getConnection();
        try {
            const [result] = await conn.query<RowDataPacket[]>(get_all_users);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ error: true, message: error.message });
        } finally {
            conn.release();
        }
    };

    private readonly searchUser = async (
        email: string,
        phone: string,
        conn: PoolConnection
    ) => {
        if (conn && email && phone) {
            const [[{ count }]] = await conn.query<RowDataPacket[]>(
                search_for_user,
                [email, phone]
            );
            return count === 0;
        } else {
            return false;
        }
    };

    public createUser = async (req: Request, res: Response) => {
        const randomID = uniqid();
        const password = this.transformer.encrypt(randomID);
        const [secret] = await generateSecrets(req.body.email);
        req.body.password = password;
        req.body.secret_token = secret;
        req.body.auth_token = secret;
        req.body.phone = formatPhone(req.body.phone);
        this.db.getConnection().then((conn) => {
            this.searchUser(req.body.email, req.body.phone, conn)
                .then((newUser) => {
                    if (newUser) {
                        conn.query<ResultSetHeader>(create_new_user, [req.body])
                            .then(([result]) => {
                                if (result.affectedRows) {
                                    const transportInfo: TransportInfo = {
                                        to: req.body.email,
                                        subject: "Account created with CDSA",
                                    };
                                    const context: UserCreationEmailContext = {
                                        first_name: req.body.first_name,
                                        link: `${ADMIN_PORTAL}/login`,
                                        username: req.body.email,
                                        password: randomID,
                                    };
                                    this.emailService.AccountCreationEmail(
                                        transportInfo,
                                        context
                                    );
                                    res.status(200).json(result);
                                } else {
                                    throw new Error("Error creating user");
                                }
                            })
                            .catch((err) =>
                                res
                                    .status(500)
                                    .json({ error: true, message: err.message })
                            );
                    } else {
                        throw new Error("User with same email or phone exists");
                    }
                })
                .catch((err) =>
                    res.status(500).json({ error: true, message: err.message })
                )
                .finally(() => {
                    conn.release();
                });
        });
    };

    public deleteUser = async (req: Request, res: Response) => {
        const { id } = req.params;
        this.db.getConnection().then((conn) => {
            conn.query<ResultSetHeader>(delete_user, [id])
                .then(([result]) => {
                    if (result.affectedRows) {
                        res.status(200).json(result);
                    } else {
                        throw new Error("Unable to delete the user");
                    }
                })
                .catch((err) =>
                    res.status(500).json({ error: true, message: err.message })
                )
                .finally(() => conn.release());
        });
    };
}
