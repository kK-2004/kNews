class SourceRepository {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Find all sources.
   * @returns {Promise<Object[]>}
   */
  async findAll() {
    const { data, error } = await this.supabase
      .from('source')
      .select('*');

    if (error) {
      throw new Error(`Failed to find all sources: ${error.message}`);
    }

    return data;
  }

  /**
   * Find a source by its ID.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const { data, error } = await this.supabase
      .from('source')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find source by id: ${error.message}`);
    }

    return data;
  }

  /**
   * Find sources by category.
   * @param {string} category
   * @returns {Promise<Object[]>}
   */
  async findByCategory(category) {
    const { data, error } = await this.supabase
      .from('source')
      .select('*')
      .eq('category', category);

    if (error) {
      throw new Error(`Failed to find sources by category: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new source.
   * @param {Object} data - Source fields to insert.
   * @returns {Promise<Object>}
   */
  async create(data) {
    const { data: row, error } = await this.supabase
      .from('source')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create source: ${error.message}`);
    }

    return row;
  }

  /**
   * Update a source by ID.
   * @param {string} id
   * @param {Object} data - Fields to update.
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const { data: row, error } = await this.supabase
      .from('source')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update source ${id}: ${error.message}`);
    }

    return row;
  }

  /**
   * Delete a source by ID.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const { error } = await this.supabase
      .from('source')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete source ${id}: ${error.message}`);
    }
  }
}

module.exports = SourceRepository;
