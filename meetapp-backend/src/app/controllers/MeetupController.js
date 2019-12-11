import { isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Op } from 'sequelize';
import * as Yup from 'yup';
import Meetup from '../models/Meetup';
import User from '../models/User';
import File from '../models/File';

class MeetupController {
  async index(req, res) {
    const page = req.query.page || 1;
    const where = {};

    if (req.query.date) {
      const searchDate = parseISO(req.query.date);

      where.date = {
        [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
      };
    }

    const meetups = await Meetup.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: File,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
      ],
      limit: 10,
      offset: 10 * page - 10,
    });

    return res.json(meetups);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      banner_id: Yup.number()
        .transform(value => (!value ? undefined : value))
        .required('Banner is required'),
      title: Yup.string()
        .min(6, 'O título precisa de ter 6 caracteres no mínimo')
        .required('O título é obrigatório'),
      description: Yup.string().required('A Descrição é obrigatório'),
      date: Yup.date().required('A Data é obrigatória'),
      localization: Yup.string().required('A Localização é obrigatória'),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { date, title, description, localization, banner_id } = req.body;

    const meetup = await Meetup.create({
      user_id: req.userId,
      title,
      description,
      localization,
      banner_id,
      date,
    });

    return res.json(meetup);
  }

  async update(req, res) {
    const meetup = await Meetup.findOne({
      where: {
        id: req.params.id,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id'],
        },
      ],
    });

    if (!meetup) {
      return res.status(400).json({ error: 'This not exists' });
    }
    if (meetup.user.id !== req.userId) {
      return res.status(401).json({ error: 'This not belongs to you' });
    }

    if (isBefore(meetup.date, new Date())) {
      return res.status(400).json({ error: "You can't update past meetup" });
    }

    await meetup.update(req.body);
    return res.json(meetup);
  }

  async delete(req, res) {
    const meetup = await Meetup.findOne({
      where: {
        id: req.params.id,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id'],
        },
      ],
    });

    if (!meetup) {
      return res.status(400).json({ error: 'This not exists' });
    }
    if (meetup.user.id !== req.userId) {
      return res.status(401).json({ error: 'This not belongs to you' });
    }

    if (isBefore(meetup.date, new Date())) {
      return res.status(400).json({ error: "You can't canceling past meetup" });
    }

    await meetup.destroy();
    return res.json({ success: true });
  }

  async show(req, res) {
    const meetup = await Meetup.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: File,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
      ],
    });

    if (!meetup) {
      return res.status(400).json({ error: 'This not exists' });
    }
    if (meetup.user.id !== req.userId) {
      return res.status(401).json({ error: 'This not belongs to you' });
    }

    return res.json(meetup);
  }
}
export default new MeetupController();
