import { Request, Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import DB from "../constructs/db";
import {
    create_category,
    get_trainer_categories,
    get_student_categories,
    get_class_categories,
    add_to_trainer_category,
    add_to_student_category,
    add_to_class_category,
} from "../queries/admin_queries";

export default class CommonController {
    protected db: DB;

    constructor() {
        this.db = new DB();
    }

    public createCategory = async (req: Request, res: Response) => {
        const conn = await this.db.getConnection();
        const { entity, name, description, image } = req.body;
        let tableName = "";
        try {
            if (entity === "trainer") tableName = "trainer_categories";
            if (entity === "student") tableName = "student_categories";
            if (entity === "class") tableName = "class_categories";
            const [result] = await conn.query<ResultSetHeader>(
                create_category,
                [tableName, name, description]
            );
            if (result && result.affectedRows) {
                res.status(200).json({
                    success: true,
                    message: `${entity} category created`,
                });
            } else {
                throw new Error(`Error creating ${entity} category`);
            }
        } catch (error: any) {
            console.log(error);
            res.status(401).json(error.message);
        } finally {
            conn.release();
        }
    };

    public getCategory = async (req: Request, res: Response) => {
        const conn = await this.db.getConnection();
        const { entity } = req.params;
        let query = "";
        try {
            if (entity === "trainer") query = get_trainer_categories;
            if (entity === "student") query = get_student_categories;
            if (entity === "class") query = get_class_categories;
            const [result] = await conn.query<RowDataPacket[]>(query);
            if (result) res.status(200).json(result);
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        } finally {
            conn.release();
        }
    };

    public addToCategory = async (req: Request, res: Response) => {
        const conn = await this.db.getConnection();
        try {
            let query = "";
            const { cat_id, user_list } = req.body;
            const { entity } = req.params;
            const values = user_list.map((user: any) => [user, cat_id]);
            if (entity === "trainer") query = add_to_trainer_category;
            if (entity === "student") query = add_to_student_category;
            if (entity === "class") query = add_to_class_category;
            const [result] = await conn.query<ResultSetHeader>(query, [values]);
            if (result.affectedRows > 0) {
                res.status(200).json({
                    success: true,
                    message: `${entity} added to Category`,
                });
            } else {
                res.status(422).json({
                    error: true,
                    message: `Unable to add ${entity} to category`,
                });
            }
        } catch (error: any) {
            res.status(500).json({ error: true, message: error.message });
        } finally {
            conn.release();
        }
    };
}
